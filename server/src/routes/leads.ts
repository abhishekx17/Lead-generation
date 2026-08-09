import { Router, Request, Response, NextFunction } from 'express';
import { param, query } from 'express-validator';
import mongoose from 'mongoose';
import Campaign from '../models/Campaign';
import Lead from '../models/Lead';
import { requireAuth, requireOrgRole } from '../auth/middleware';
import { withAudit } from '../audit/middleware';
import { withOrgFilter } from '../middleware/orgScope';
// @ts-ignore — validate middleware is still CJS
import validate from '../../middleware/validate';
// @ts-ignore — rateLimiter is still CJS
import { scrapeLimiter } from '../../middleware/rateLimiter';
// @ts-ignore — scrapeQueue is still CJS
import { enqueueScrapeJob } from '../../jobs/scrapeQueue';
// @ts-ignore — logger is still CJS
import logger from '../../utils/logger';

const router = Router();

const campaignIdParam = param('campaignId')
  .custom((value) => mongoose.Types.ObjectId.isValid(value))
  .withMessage('Invalid campaign ID');

// ─── POST /scrape/:campaignId — Trigger scrape ─────────────────────────────
router.post(
  '/scrape/:campaignId',
  scrapeLimiter,
  requireAuth,
  requireOrgRole(['owner', 'admin', 'member']),
  campaignIdParam,
  validate,
  withAudit('campaign.scrape_trigger', 'campaign'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await Campaign.findOne(
        withOrgFilter({ _id: req.params.campaignId }, req)
      );

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (campaign.status === 'running') {
        return res.status(409).json({ error: 'Scraping is already in progress for this campaign' });
      }

      campaign.status = 'running';
      await campaign.save();

      try {
        await enqueueScrapeJob(campaign._id);
      } catch (queueError: any) {
        campaign.status = 'pending';
        await campaign.save();

        if (queueError.message?.includes('Job already exists')) {
          return res.status(409).json({ error: 'A scrape job is already queued for this campaign' });
        }

        logger.error(`Failed to enqueue scrape job: ${queueError.message}`);
        return res.status(503).json({
          error: 'Job queue unavailable. Ensure Redis is running (REDIS_URL in .env).',
        });
      }

      res.status(202).json({
        success: true,
        id: campaign._id.toString(),
        message: 'Scraping job queued',
        campaignId: campaign._id,
        status: 'running',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /:campaignId — List leads ─────────────────────────────────────────
router.get(
  '/:campaignId',
  requireAuth,
  requireOrgRole(['owner', 'admin', 'member']),
  [
    campaignIdParam,
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await Campaign.findOne(
        withOrgFilter({ _id: req.params.campaignId }, req)
      );
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const search = (req.query.search as string)?.trim();

      const baseFilter: Record<string, unknown> = { campaignId: campaign._id };

      if (search) {
        const regex = new RegExp(search, 'i');
        (baseFilter as any).$or = [{ email: regex }, { businessName: regex }];
      }

      const filter = withOrgFilter(baseFilter, req);

      const total = await Lead.countDocuments(filter);
      const leads = await Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      res.json({
        leads,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /:campaignId/export — Export leads (audit wrapped) ─────────────────
router.get(
  '/:campaignId/export',
  requireAuth,
  requireOrgRole(['owner', 'admin', 'member']),
  campaignIdParam,
  validate,
  withAudit('lead.export', 'lead'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await Campaign.findOne(
        withOrgFilter({ _id: req.params.campaignId }, req)
      );
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const leads = await Lead.find(
        withOrgFilter({ campaignId: campaign._id }, req)
      ).lean();

      res.json({ id: campaign._id.toString(), leads });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
