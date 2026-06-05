const express = require('express');
const { body } = require('express-validator');
const mongoose = require('mongoose');
const validate = require('../middleware/validate');
const { queryLeads, queryAllCampaigns } = require('../services/rag');

const router = express.Router();

router.post(
  '/',
  [
    body('question').trim().notEmpty().withMessage('Question is required'),
    body('campaignId')
      .optional()
      .custom((value) => !value || mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid campaign ID'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { question, campaignId } = req.body;

      const answer = campaignId
        ? await queryLeads(question, campaignId)
        : await queryAllCampaigns(question);

      res.json({ answer });
    } catch (error) {
      if (error.message === 'Campaign not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

module.exports = router;
