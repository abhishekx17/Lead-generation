import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import { requireAuth, requireOrgRole } from '../auth/middleware';
import { withAudit } from '../audit/middleware';
// @ts-ignore — validate middleware is still CJS
import validate from '../../middleware/validate';
// @ts-ignore — rag service is still CJS
import { queryLeads, queryAllCampaigns } from '../../services/rag';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireOrgRole(['owner', 'admin', 'member']),
  [
    body('question').trim().notEmpty().withMessage('Question is required'),
    body('campaignId')
      .optional()
      .custom((value) => !value || mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid campaign ID'),
  ],
  validate,
  withAudit('chat.query', 'chat'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, campaignId } = req.body;

      const answer = campaignId
        ? await queryLeads(question, campaignId)
        : await queryAllCampaigns(question);

      res.json({ id: campaignId ?? 'all', answer });
    } catch (error: any) {
      if (error.message === 'Campaign not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

export default router;
