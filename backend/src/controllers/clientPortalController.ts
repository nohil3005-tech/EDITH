import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ClientPortalService } from '../services/client/ClientPortalService';
import { successResponse } from '../types/api';

const portalService = new ClientPortalService();

export async function getProject(req: AuthRequest, res: Response): Promise<void> {
  const data = await portalService.getProjectView(req.params.id);
  res.json(successResponse(data));
}
