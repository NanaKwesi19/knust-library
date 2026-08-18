import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { FineStatus, Role } from '@prisma/client';
import { protect } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';
// Where Paystack sends the student back to after checkout. The frontend page
// at this route should call GET /payments/verify/:reference to confirm status.
const PAYMENT_CALLBACK_URL = process.env.PAYMENT_CALLBACK_URL || `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5173'}/payments/callback`;

interface PaystackInitializeResponse {
  data: { authorization_url: string; access_code: string; reference: string };
}

interface PaystackVerifyResponse {
  data: { status: string; reference: string; amount: number };
}

function paystackConfigured(res: Response): boolean {
  if (!PAYSTACK_SECRET_KEY) {
    res.status(503).json({
      success: false,
      error: 'Online payments are not configured yet. Ask an administrator to set PAYSTACK_SECRET_KEY.'
    });
    return false;
  }
  return true;
}

/**
 * Marks a fine as paid from a successful Paystack transaction. Idempotent -
 * safe to call from both the webhook and the manual verify endpoint, since
 * Paystack may deliver the webhook before, after, or never relative to the
 * student's browser redirect.
 */
async function settleFineFromPayment(reference: string, providerAmountPesewas: number) {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { fine: true }
  });

  if (!payment) {
    throw new Error(`No payment record found for reference ${reference}.`);
  }

  if (payment.status === 'COMPLETED') {
    return { payment, alreadySettled: true };
  }

  // Guard against a tampered/mismatched amount coming back from the provider.
  const expectedPesewas = Math.round(payment.amount * 100);
  if (providerAmountPesewas !== expectedPesewas) {
    throw new Error(
      `Amount mismatch for reference ${reference}: expected ${expectedPesewas}, received ${providerAmountPesewas}.`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { reference },
      data: { status: 'COMPLETED' }
    });

    await tx.fine.update({
      where: { id: payment.fineId },
      data: { status: FineStatus.PAID }
    });

    await tx.notification.create({
      data: {
        userId: payment.userId,
        title: 'Fine Paid',
        message: `Your payment of GH¢${payment.amount.toFixed(2)} was received. The fine has been cleared.`,
        type: 'FINE_PAID',
        priority: 'NORMAL'
      }
    });

    await tx.auditLog.create({
      data: {
        action: 'PAYMENT_RECEIVED',
        description: `Paystack payment settled for fine #${payment.fineId} (GH¢${payment.amount.toFixed(2)}), ref ${reference}.`,
        userId: payment.userId
      }
    });

    return updatedPayment;
  });

  return { payment: result, alreadySettled: false };
}

/**
 * POST /api/v1/payments/webhook
 * Paystack calls this directly (no auth header). Must be mounted with a raw
 * body available on req so the HMAC signature can be verified - see
 * express.json({ verify }) in index.ts, which stashes req.rawBody.
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  if (!PAYSTACK_SECRET_KEY) {
    res.status(503).end();
    return;
  }

  const signature = req.headers['x-paystack-signature'] as string | undefined;
  const rawBody = (req as any).rawBody as Buffer | undefined;

  if (!signature || !rawBody) {
    res.status(400).end();
    return;
  }

  const expectedSignature = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  if (expectedSignature !== signature) {
    console.warn('[Paystack Webhook] Invalid signature - rejecting.');
    res.status(401).end();
    return;
  }

  // Acknowledge immediately; Paystack retries on non-2xx or timeout.
  res.status(200).end();

  const event = req.body;
  if (event?.event === 'charge.success') {
    try {
      await settleFineFromPayment(event.data.reference, event.data.amount);
    } catch (error) {
      console.error('[Paystack Webhook] Failed to settle payment:', error);
    }
  }
});

router.use(protect);

/**
 * POST /api/v1/payments/fines/:fineId/initiate
 * Student initiates payment for their own fine. Staff may initiate on behalf
 * of a student (e.g. paying at a front-desk terminal).
 */
router.post('/fines/:fineId/initiate', async (req: Request, res: Response): Promise<void> => {
  if (!paystackConfigured(res)) return;

  try {
    const fineId = Number(req.params.fineId);
    if (!Number.isInteger(fineId) || fineId <= 0) {
      res.status(400).json({ success: false, error: 'Invalid fine ID.' });
      return;
    }

    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      include: { loan: { include: { user: true } } }
    });

    if (!fine) {
      res.status(404).json({ success: false, error: 'Fine not found.' });
      return;
    }

    const isOwner = fine.loan.userId === req.user!.id;
    const isStaff = req.user!.role === Role.ADMIN || req.user!.role === Role.LIBRARIAN;
    if (!isOwner && !isStaff) {
      res.status(403).json({ success: false, error: 'You can only pay your own fines.' });
      return;
    }

    if (fine.status === FineStatus.PAID) {
      res.status(400).json({ success: false, error: 'This fine has already been paid.' });
      return;
    }

    const payer = fine.loan.user;
    const reference = crypto.randomUUID();

    // Record the attempt up front so the webhook/verify step has something
    // to settle against even if the student never returns to the callback.
    await prisma.payment.create({
      data: {
        reference,
        amount: fine.amount,
        method: 'PAYSTACK',
        status: 'PENDING',
        userId: payer.id,
        fineId: fine.id
      }
    });

    const initResponse = await axios.post<PaystackInitializeResponse>(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: payer.email,
        amount: Math.round(fine.amount * 100), // GHS -> pesewas
        reference,
        callback_url: PAYMENT_CALLBACK_URL,
        metadata: { fineId: fine.id, userId: payer.id }
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    res.status(200).json({
      success: true,
      data: {
        authorizationUrl: initResponse.data.data.authorization_url,
        reference
      }
    });
  } catch (error: any) {
    console.error('Paystack initiate error:', error?.response?.data || error);
    res.status(502).json({ success: false, error: 'Failed to start the payment with the provider. Please try again.' });
  }
});

/**
 * GET /api/v1/payments/verify/:reference
 * Manual fallback for the callback page in case the webhook hasn't landed
 * yet (or was missed) by the time the student is redirected back.
 */
router.get('/verify/:reference', async (req: Request, res: Response): Promise<void> => {
  if (!paystackConfigured(res)) return;

  try {
    const reference = String(req.params.reference);

    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) {
      res.status(404).json({ success: false, error: 'Payment not found.' });
      return;
    }

    const isOwner = payment.userId === req.user!.id;
    const isStaff = req.user!.role === Role.ADMIN || req.user!.role === Role.LIBRARIAN;
    if (!isOwner && !isStaff) {
      res.status(403).json({ success: false, error: 'Not authorized to view this payment.' });
      return;
    }

    if (payment.status === 'COMPLETED') {
      res.status(200).json({ success: true, data: { status: 'COMPLETED' } });
      return;
    }

    const verifyResponse = await axios.get<PaystackVerifyResponse>(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
    });

    const data = verifyResponse.data.data;
    if (data.status === 'success') {
      await settleFineFromPayment(reference, data.amount);
      res.status(200).json({ success: true, data: { status: 'COMPLETED' } });
    } else {
      res.status(200).json({ success: true, data: { status: data.status } });
    }
  } catch (error: any) {
    console.error('Paystack verify error:', error?.response?.data || error);
    res.status(502).json({ success: false, error: 'Failed to verify payment with the provider.' });
  }
});

/**
 * GET /api/v1/payments/mine
 * A student's own payment history.
 */
router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.id },
      include: { fine: { include: { loan: { include: { copy: { include: { book: true } } } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ success: false, error: 'Failed to load payment history.' });
  }
});

export default router;
