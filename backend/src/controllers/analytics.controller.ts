import { Request, Response } from 'express';
import axios from 'axios';

interface DemandRequestQuery {
  category: string;
  subject: string;
  borrowMonth: string;
}

export const getPredictiveDemand = async (req: Request, res: Response): Promise<void> => {
  // 1. Extract query parameters from the request
  const { category, subject, borrowMonth } = req.query as unknown as DemandRequestQuery;

  if (!category || !subject || !borrowMonth) {
    res.status(400).json({ 
      success: false, 
      error: 'Missing required parameters. Please provide category, subject, and borrowMonth.' 
    });
    return;
  }

  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    // 2. Forward the request securely over the internal network to the Python FastAPI microservice
    const response = await axios.post(`${mlServiceUrl}/api/v1/predict/demand`, {
      category,
      subject,
      borrow_month: parseInt(borrowMonth, 10)
    });

    // 3. Serve the machine learning prediction back to the requester cleanly
    res.status(200).json({
      success: true,
      message: 'Predictive intelligence analytics completed successfully.',
      data: response.data
    });

  } catch (error: any) {
    console.error('[AXIOS PROXY ERROR]:', error.message);
    
    // Handle cases where the ML service might be temporarily resting or offline
    res.status(502).json({ 
      success: false, 
      error: 'The predictive machine learning engine is currently unreachable or uncompiled.' 
    });
  }
};