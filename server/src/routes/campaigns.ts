import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import mongoose from 'mongoose';
import Campaign from '../models/Campaign';
import Lead from '../models/Lead';
import { requireAuth, requireOrgRole } from '../auth/middleware';
import { withAudit } from '../audit/middleware';
import { withOrgFilter, assertOrgContext } from '../middleware/orgScope';
// @ts-ignore — validate middleware is still CJS
import validate from '../../middleware/validate';
// @ts-ignore — chroma config is still CJS
import { getChromaClient, toCollectionName } from '../../config/chroma';

const router = Router();

const campaignIdValidation = param('id')
  .custom((value) => mongoose.Types.ObjectId.isValid(value))
  .withMessage('Invalid campaign ID');

// ─── POST / — Create campaign ────────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  requireOrgRole(['owner', 'admin', 'member']),
  [
    body('name').trim().notEmpty().withMessage('Campaign name is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('targetAudience').trim().notEmpty().withMessage('Target audience is required'),
    body('requiredLeads')
      .isInt({ min: 10, max: 1000 })
      .withMessage('Required leads must be between 10 and 1000'),
  ],
  validate,
  withAudit('campaign.create', 'campaign'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = assertOrgContext(req);
      const { name, location, targetAudience, requiredLeads } = req.body;

      const existing = await Campaign.findOne(
        withOrgFilter({ name }, req)
      );
      if (existing) {
        return res.status(409).json({ error: 'A campaign with this name already exists in your organization' });
      }

      const campaign = await Campaign.create({
        organizationId,
        name,
        location,
        targetAudience,
        requiredLeads,
        status: 'pending',
      });

      res.status(201).json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET / — List campaigns ───────────────────────────────────────────────────
router.get(
  '/',
  requireAuth,
  requireOrgRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaigns = await Campaign.find(withOrgFilter({}, req))
        .sort({ createdAt: -1 })
        .lean();
      res.json(campaigns);
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /:id — Get single campaign ──────────────────────────────────────────
router.get(
  '/:id',
  requireAuth,
  requireOrgRole(['owner', 'admin', 'member']),
  campaignIdValidation,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await Campaign.findOne(
        withOrgFilter({ _id: req.params.id }, req)
      ).lean();
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const leadCount = await Lead.countDocuments({ campaignId: campaign._id });
      res.json({ ...campaign, leadCount });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /:id — Delete campaign ───────────────────────────────────────────
router.delete(
  '/:id',
  requireAuth,
  requireOrgRole(['owner', 'admin']),
  campaignIdValidation,
  validate,
  withAudit('campaign.delete', 'campaign'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await Campaign.findOne(
        withOrgFilter({ _id: req.params.id }, req)
      );
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      await Lead.deleteMany({ campaignId: campaign._id });

      try {
        const client = getChromaClient();
        await client.deleteCollection({ name: toCollectionName(campaign.name) });
      } catch {
        // Collection may not exist
      }

      await campaign.deleteOne();

      res.json({ success: true, id: req.params.id, message: 'Campaign and its leads deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
