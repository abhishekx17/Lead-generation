const express = require('express');
const { param, query } = require('express-validator');
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const validate = require('../middleware/validate');
const { scrapeLimiter } = require('../middleware/rateLimiter');
const { enqueueScrapeJob } = require('../jobs/scrapeQueue');
const logger = require('../utils/logger');

const router = express.Router();

const campaignIdParam = param('campaignId')
  .custom((value) => mongoose.Types.ObjectId.isValid(value))
  .withMessage('Invalid campaign ID');

router.post('/scrape/:campaignId', scrapeLimiter, campaignIdParam, validate, async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);

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
    } catch (queueError) {
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
      message: 'Scraping job queued',
      campaignId: campaign._id,
      status: 'running',
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/:campaignId',
  [
    campaignIdParam,
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const campaign = await Campaign.findById(req.params.campaignId);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const search = req.query.search?.trim();

      const filter = { campaignId: campaign._id };

      if (search) {
        const regex = new RegExp(search, 'i');
        filter.$or = [{ email: regex }, { businessName: regex }];
      }

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

module.exports = router;
