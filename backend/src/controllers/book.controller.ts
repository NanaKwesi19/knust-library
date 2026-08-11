import { Request, Response } from 'express';
import {prisma} from '../lib/prisma.js';

interface BookCatalogPayload {
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  publicationYear?: number;
  category?: string;
  description?: string;
  shelfLocation?: string;
}

interface PhysicalCopiesPayload {
  bookId: number;
  copies: Array<{
    barcode: string;
    location?: string;
    condition?: string;
  }>;
}

// 1. Core Catalog Registry Endpoint
export const addBookToCatalog = async (req: Request, res: Response): Promise<void> => {
  const { 
    isbn, title, author, publisher, 
    publicationYear, category, description, shelfLocation
  } = req.body as BookCatalogPayload;

  if (!title || !author) {
    res.status(400).json({ success: false, error: 'Core metadata parameters missing: title and author are required.' });
    return;
  }

  try {
    // Prevent duplicate ISBN entries in the global catalog
    if (isbn) {
      const existingBook = await prisma.book.findUnique({ where: { isbn } });
      if (existingBook) {
        res.status(409).json({ 
          success: false, 
          error: `A resource with ISBN ${isbn} already exists in the library asset register.` 
        });
        return;
      }
    }

    const newBook = await prisma.book.create({
      data: {
        isbn,
        title,
        author,
        publisher,
        publishYear: publicationYear,
        category: category || 'Uncategorized',
        description,
        shelfLocation: shelfLocation || 'Unknown'
      },
      select: {
        id: true,
        title: true,
        author: true,
        isbn: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Master book title successfully committed to catalog matrix.',
      data: newBook
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Database catalog allocation execution aborted.' });
  }
};

// 2. Physical Inventory Expansion Endpoint (Barcode/RFID Asset Intake)
export const addPhysicalCopies = async (req: Request, res: Response): Promise<void> => {
  const { bookId, copies } = req.body as PhysicalCopiesPayload;

  if (!bookId || !copies || !Array.isArray(copies) || copies.length === 0) {
    res.status(400).json({ success: false, error: 'Payload must contain a valid bookId and a non-empty copies array.' });
    return;
  }

  try {
    // Isolate target parent book entry
    const targetBook = await prisma.book.findUnique({ where: { id: Number(bookId) } });
    if (!targetBook) {
      res.status(404).json({ success: false, error: 'The parent catalog book record was not found.' });
      return;
    }

    // Wrap the entire item intake matrix inside an atomic transaction block
    const intakeSummary = await prisma.$transaction(async (tx) => {
      const createdItems = [];

      for (const item of copies) {
        if (!item.barcode) throw new Error('Every physical copy must carry a unique scannable barcode.');

        // Enforce barcode uniqueness proactively
        const explicitBarcodeCheck = await tx.bookCopy.findUnique({ where: { barcode: item.barcode } });
        if (explicitBarcodeCheck) {
          throw new Error(`Critical Conflict: Barcode [${item.barcode}] is already registered to another asset.`);
        }

        const newCopy = await tx.bookCopy.create({
          data: {
            bookId: targetBook.id,
            barcode: item.barcode,
            condition: item.condition || 'good',
            status: 'AVAILABLE'
          }
        });
        createdItems.push(newCopy.id);
      }

      // Log the batch administrative intervention
      await tx.auditLog.create({
        data: {
          userId: (req.user as any)?.id ? Number((req.user as any).id) : null,
          action: 'INVENTORY_BATCH_INTAKE',
          entityType: 'Book',
          entityId: String(targetBook.id),
          description: `Added ${copies.length} copies to ${targetBook.title}`,
          ipAddress: req.ip || '0.0.0.0',
          details: { count: copies.length, parentTitle: targetBook.title }
        }
      });

      return { count: createdItems.length };
    });

    res.status(201).json({
      success: true,
      message: `Successfully registered ${intakeSummary.count} physical book assets to library shelves. Counters auto-synchronized natively.`,
    });

  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Inventory allocation aborted due to database constraint violation.' 
    });
  }
};