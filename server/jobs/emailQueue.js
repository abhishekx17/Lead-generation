const net = require('net');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const EmailAccount = require('../models/EmailAccount');
const EmailLog = require('../models/EmailLog');
const Lead = require('../models/Lead');
const { decrypt, encrypt } = require('../utils/encryption');
const { refreshAccessToken } = require('../services/gmailOAuth');
const { randomDelay } = require('../utils/sleep');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let emailQueue = null;
let redisAvailable = false;

// In-memory fallback queue variables
const memoryQueue = [];
let processingMemoryQueue = false;

/**
 * Check if Redis is reachable before creating a Bull queue.
 */
function checkRedis(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname || '127.0.0.1';
      const port = parseInt(parsed.port, 10) || 6379;

      const socket = net.createConnection({ host, port, timeout: 1500 });
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Render standard template syntax like {{businessName}}
 */
function renderTemplate(template, data) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Build Nodemailer OAuth2 transporter
 */
function buildTransporter(account, decrypted) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: account.email,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: decrypted.refreshToken,
      accessToken: decrypted.accessToken,
    },
  });
}

/**
 * Core function that executes a single email send job
 */
async function sendEmailOutreach({ campaignId, leadId, emailAccountId, logId, subjectTemplate, bodyTemplate }) {
  logger.info(`Starting outreach send for lead ${leadId} using email account ${emailAccountId}`);

  // Fetch the log first to update status
  const log = await EmailLog.findById(logId);
  if (!log) {
    logger.error(`EmailLog ${logId} not found. Skipping send.`);
    return;
  }

  try {
    // 1. Fetch EmailAccount and decrypt credentials
    const account = await EmailAccount.findById(emailAccountId);
    if (!account) {
      throw new Error(`Email account ${emailAccountId} not found.`);
    }

    if (account.status === 'revoked') {
      throw new Error(`Email account ${account.email} has been disconnected/revoked.`);
    }

    // Daily limit check and reset
    const now = new Date();
    if (account.dailySendResetAt && now >= account.dailySendResetAt) {
      account.dailySendCount = 0;
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);
      account.dailySendResetAt = nextMidnight;
      await account.save();
    }

    const dailyLimit = parseInt(process.env.GMAIL_DAILY_SEND_LIMIT || '450', 10);
    if (account.dailySendCount >= dailyLimit) {
      throw new Error(`Daily send limit of ${dailyLimit} reached for account ${account.email}.`);
    }

    let accessToken = decrypt(account.accessTokenEncrypted);
    const refreshToken = decrypt(account.refreshTokenEncrypted);

    if (!refreshToken) {
      throw new Error('Refresh token is missing. Please reconnect the account.');
    }

    // Refresh access token if expired or near expiry (5 minute buffer)
    const bufferTime = 5 * 60 * 1000;
    if (!account.tokenExpiry || (new Date(account.tokenExpiry).getTime() - bufferTime) <= Date.now()) {
      logger.info(`Access token for ${account.email} is expired/expiring soon. Refreshing...`);
      try {
        const refreshResult = await refreshAccessToken(refreshToken);
        account.accessTokenEncrypted = encrypt(refreshResult.accessToken);
        account.tokenExpiry = refreshResult.expiryDate;
        account.status = 'connected';
        await account.save();
        accessToken = refreshResult.accessToken;
        logger.info(`Access token for ${account.email} refreshed successfully.`);
      } catch (err) {
        account.status = 'error';
        await account.save();
        throw new Error(`Failed to refresh credentials: ${err.message}`);
      }
    }

    // 2. Fetch Lead details
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error(`Lead ${leadId} not found.`);
    }

    if (!lead.email) {
      throw new Error(`Lead ${leadId} does not have an email address.`);
    }

    // 3. Render subject/body templates
    const subject = renderTemplate(subjectTemplate, lead);
    const body = renderTemplate(bodyTemplate, lead);

    // 4. Construct transporter and send mail
    const transporter = buildTransporter(account, { accessToken, refreshToken });
    const mailOptions = {
      from: `"${account.email}" <${account.email}>`,
      to: lead.email,
      subject,
      text: body,
    };

    await transporter.sendMail(mailOptions);

    // 5. Update EmailLog and EmailAccount limits
    log.status = 'sent';
    log.sentAt = new Date();
    await log.save();

    account.dailySendCount += 1;
    await account.save();

    logger.info(`Outreach email successfully sent to ${lead.email}`);
  } catch (error) {
    logger.error(`Error sending email to lead ${leadId}: ${error.message}`);
    log.status = 'failed';
    log.errorMessage = error.message;
    await log.save();

    // If OAuth error, mark EmailAccount status as 'error'
    if (error.message.includes('Invalid Credentials') || error.message.includes('refresh') || error.message.includes('revoke')) {
      try {
        await EmailAccount.findByIdAndUpdate(emailAccountId, { status: 'error' });
      } catch (err) {
        logger.error(`Failed to mark email account in error state: ${err.message}`);
      }
    }

    throw error;
  }
}

/**
 * Memory queue processing loop for sequential throttled sending (without Redis)
 */
async function processMemoryQueue() {
  if (processingMemoryQueue) return;
  processingMemoryQueue = true;

  logger.info(`Starting in-memory fallback queue processor (queue size: ${memoryQueue.length})`);

  while (memoryQueue.length > 0) {
    const job = memoryQueue.shift();
    try {
      await sendEmailOutreach(job);
    } catch (err) {
      logger.error(`Direct email send job failed: ${err.message}`);
    }
    // Throttle 3-5 seconds between sends
    await randomDelay(3000, 5000);
  }

  processingMemoryQueue = false;
  logger.info('In-memory fallback queue processor finished processing all pending jobs');
}

/**
 * Initialize Bull Queue
 */
async function initQueue() {
  const available = await checkRedis(REDIS_URL);

  if (!available) {
    logger.warn(
      'Redis not running — email outreach jobs will execute directly in background memory. ' +
      'Start Redis on port 6379 if you want background Bull queue processing.'
    );
    return;
  }

  try {
    const Queue = require('bull');

    emailQueue = new Queue('email-send', REDIS_URL, {
      defaultJobOptions: {
        attempts: 2,
        backoff: 10000, // wait 10 seconds before retry
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    emailQueue.process(async (job) => {
      const { campaignId, leadId, emailAccountId, logId, subjectTemplate, bodyTemplate } = job.data;
      
      // Execute the email send
      await sendEmailOutreach({
        campaignId,
        leadId,
        emailAccountId,
        logId,
        subjectTemplate,
        bodyTemplate,
      });

      // Throttle delay per job to respect Google API limits
      await randomDelay(3000, 5000);
    });

    emailQueue.on('completed', (job) => {
      logger.info(`Email job ${job.id} completed successfully`);
    });

    emailQueue.on('failed', (job, error) => {
      logger.error(`Email job ${job.id} failed: ${error.message}`);
    });

    emailQueue.on('error', (error) => {
      logger.error(`Email queue error: ${error.message}`);
    });

    redisAvailable = true;
    logger.info('Email queue connected to Redis successfully');
  } catch (err) {
    logger.warn(`Could not initialize Bull queue for email: ${err.message}`);
  }
}

// Initialize the queue
initQueue();

/**
 * Add outreach job to the queue
 */
const enqueueEmailSendJob = async ({ campaignId, leadId, emailAccountId, subjectTemplate, bodyTemplate }) => {
  // 1. Create a queued log in the database
  const log = await EmailLog.create({
    campaignId,
    emailAccountId,
    leadId,
    subject: subjectTemplate.replace(/\{\{(\w+)\}\}/g, '...'), // placeholders for subject preview
    status: 'queued',
  });

  const payload = {
    campaignId: campaignId.toString(),
    leadId: leadId.toString(),
    emailAccountId: emailAccountId.toString(),
    logId: log._id.toString(),
    subjectTemplate,
    bodyTemplate,
  };

  // 2. Add to Bull Queue if Redis is available, otherwise use memory fallback
  if (emailQueue && redisAvailable) {
    const job = await emailQueue.add(payload, {
      jobId: `email-${log._id}`,
    });
    return { id: job.id, logId: log._id };
  }

  // Fallback: run using memory queue
  memoryQueue.push(payload);
  processMemoryQueue(); // Trigger async execution

  return { id: `mem-${log._id}`, logId: log._id };
};

module.exports = { emailQueue, enqueueEmailSendJob };
