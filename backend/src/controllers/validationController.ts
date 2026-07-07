import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ValidationService } from '../services/dropshipping/ValidationService';
import { successResponse } from '../types/api';

const validationService = new ValidationService();

export async function startValidation(req: AuthRequest, res: Response): Promise<void> {
  validationService.startValidation(req.params.id).catch(() => {});
  res.json(successResponse({ started: true, productId: req.params.id }));
}

export async function getValidationStatus(req: AuthRequest, res: Response): Promise<void> {
  const steps = await validationService.getStatus(req.params.id);
  res.json(successResponse(steps));
}
