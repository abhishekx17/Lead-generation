const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const validate = require('../middleware/validate');

const { getChromaClient, toCollectionName } = require('../config/chroma');

const router = express.Router();

const campaignIdValidation = param('id')
  .custom((value) => mongoose.Types.ObjectId.isValid(value))
  .withMessage('Invalid campaign ID');

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Campaign name is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('targetAudience').trim().notEmpty().withMessage('Target audience is required'),
    body('searchQuery').optional().trim(),
    body('requiredLeads')
      .isInt({ min: 10, max: 1000 })
      .withMessage('Required leads must be between 10 and 1000'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, location, targetAudience, requiredLeads, searchQuery } = req.body;

      const existing = await Campaign.findOne({ name });
      if (existing) {
        return res.status(409).json({ error: 'A campaign with this name already exists' });
      }

      const campaign = await Campaign.create({
        name,
        location,
        targetAudience,
        requiredLeads,
        searchQuery: searchQuery || '',
        status: 'pending',
      });

      res.status(201).json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/', async (req, res, next) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', campaignIdValidation, validate, async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const leadCount = await Lead.countDocuments({ campaignId: campaign._id });

    res.json({ ...campaign, leadCount });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', campaignIdValidation, validate, async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
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

    res.json({ success: true, message: 'Campaign and its leads deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
