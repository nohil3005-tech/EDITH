import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CrossLearningService } from '../services/intelligence/CrossLearningService';
import { successResponse } from '../types/api';

const crossLearning = new CrossLearningService();

export async function getInsights(_req: AuthRequest, res: Response): Promise<void> {
  const insights = await crossLearning.getInsights();
  res.json(successResponse(insights));
}
