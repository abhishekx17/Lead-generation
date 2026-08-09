const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const EmailAccount = require('../models/EmailAccount');
const EmailLog = require('../models/EmailLog');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const { decrypt } = require('../utils/encryption');
const { revokeToken } = require('../services/gmailOAuth');
const { enqueueEmailSendJob } = require('../jobs/emailQueue');
const validate = require('../middleware/validate');

const router = express.Router();

const emailAccountIdValidation = param('id')
  .custom((value) => mongoose.Types.ObjectId.isValid(value))
  .withMessage('Invalid email account ID');

const campaignIdValidation = param('campaignId')
  .custom((value) => mongoose.Types.ObjectId.isValid(value))
  .withMessage('Invalid campaign ID');

/**
 * GET /api/email-accounts
 * Fetch all connected Gmail accounts.
 */
router.get('/', async (req, res, next) => {
  try {
    const accounts = await EmailAccount.find({
      organizationId: 'default-org',
    })
      .select('-accessTokenEncrypted -refreshTokenEncrypted')
      .sort({ createdAt: -1 })
      .lean();
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/email-accounts/:id
 * Disconnect an email account, revoking tokens at Google first.
 */
router.delete('/:id', emailAccountIdValidation, validate, async (req, res, next) => {
  try {
    const account = await EmailAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    // Decrypt refresh token (or access token) to revoke it at Google
    const refreshToken = account.refreshTokenEncrypted ? decrypt(account.refreshTokenEncrypted) : null;
    const accessToken = account.accessTokenEncrypted ? decrypt(account.accessTokenEncrypted) : null;

    const tokenToRevoke = refreshToken || accessToken;
    if (tokenToRevoke) {
      await revokeToken(tokenToRevoke);
    }

    // Clear credentials and set status to revoked
    account.accessTokenEncrypted = '';
    account.refreshTokenEncrypted = '';
    account.tokenExpiry = null;
    account.status = 'revoked';
    await account.save();

    logger.info(`Disconnected and revoked tokens for account ${account.email}`);
    res.json({ success: true, message: 'Email account disconnected successfully.' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/email-accounts/:id/logs
 * Fetch outreach logs for a specific email account.
 */
router.get('/:id/logs', emailAccountIdValidation, validate, async (req, res, next) => {
  try {
    const logs = await EmailLog.find({ emailAccountId: req.params.id })
      .populate('campaignId', 'name')
      .populate('leadId', 'businessName email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/campaigns/:campaignId/outreach/send
 * Triggers the email outreach sequence for all valid leads in a campaign.
 */
router.post(
  '/campaigns/:campaignId/outreach/send',
  [
    campaignIdValidation,
    body('emailAccountId')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid email account ID'),
    body('subjectTemplate').trim().notEmpty().withMessage('Subject template is required'),
    body('bodyTemplate').trim().notEmpty().withMessage('Body template is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { campaignId } = req.params;
      const { emailAccountId, subjectTemplate, bodyTemplate } = req.body;

      // 1. Confirm campaign exists
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // 2. Confirm email account exists and is connected
      const account = await EmailAccount.findById(emailAccountId);
      if (!account) {
        return res.status(404).json({ error: 'Email account not found' });
      }
      if (account.status !== 'connected') {
        return res.status(400).json({ error: 'Selected email account is not in connected status.' });
      }

      // 3. Query all valid leads in this campaign (with valid email)
      const leads = await Lead.find({
        campaignId,
        email: { $ne: '', $exists: true },
        isValid: true,
      }).lean();

      if (leads.length === 0) {
        return res.status(400).json({ error: 'No leads with email addresses found in this campaign.' });
      }

      let queuedCount = 0;
      let duplicateCount = 0;

      // 4. Queue outreach job for each lead
      for (const lead of leads) {
        // Prevent duplicate outreach to same lead for this campaign
        const existingLog = await EmailLog.findOne({
          campaignId,
          leadId: lead._id,
          status: { $in: ['queued', 'sent'] },
        }).lean();

        if (existingLog) {
          duplicateCount++;
          continue;
        }

        await enqueueEmailSendJob({
          campaignId,
          leadId: lead._id,
          emailAccountId: account._id,
          subjectTemplate,
          bodyTemplate,
        });

        queuedCount++;
      }

      res.status(202).json({
        success: true,
        message: `Outreach email campaign queued successfully.`,
        queuedCount,
        skippedDuplicates: duplicateCount,
        totalLeads: leads.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
