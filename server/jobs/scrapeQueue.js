const logger = require('../utils/logger');
const { runScrapePipeline } = require('../services/scrapePipeline');
const net = require('net');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let scrapeQueue = null;
let redisAvailable = false;

/**
 * Check if Redis is reachable before creating a Bull queue.
 * This avoids unhandled promise rejections that crash the server.
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

async function initQueue() {
  const available = await checkRedis(REDIS_URL);

  if (!available) {
    logger.warn(
      'Redis not running — scrape jobs will execute directly (no background queue). ' +
      'Start Redis on port 6379 if you want background job processing.'
    );
    return;
  }

  try {
    const Queue = require('bull');

    scrapeQueue = new Queue('scrape-leads', REDIS_URL, {
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    scrapeQueue.process(async (job) => {
      const { campaignId } = job.data;
      logger.info(`Processing scrape job ${job.id} for campaign ${campaignId}`);
      return runScrapePipeline(campaignId);
    });

    scrapeQueue.on('completed', (job, result) => {
      logger.info(`Scrape job ${job.id} completed with ${result?.totalLeads || 0} leads`);
    });

    scrapeQueue.on('failed', (job, error) => {
      logger.error(`Scrape job ${job?.id} failed: ${error.message}`);
    });

    scrapeQueue.on('error', (error) => {
      logger.error(`Scrape queue error: ${error.message}`);
    });

    redisAvailable = true;
    logger.info('Scrape queue connected to Redis successfully');
  } catch (err) {
    logger.warn(`Could not initialize Bull queue: ${err.message}`);
  }
}

// Initialize the queue (non-blocking)
initQueue();

const enqueueScrapeJob = async (campaignId) => {
  // If Redis is available and queue exists, use the queue
  if (scrapeQueue && redisAvailable) {
    const job = await scrapeQueue.add(
      { campaignId: campaignId.toString() },
      { jobId: `scrape-${campaignId}-${Date.now()}` }
    );
    return job;
  }

  // Fallback: run the pipeline directly (no queue)
  logger.info(`Running scrape pipeline directly for campaign ${campaignId} (no Redis)`);
  runScrapePipeline(campaignId.toString()).catch((err) => {
    logger.error(`Direct scrape failed for campaign ${campaignId}: ${err.message}`);
  });

  return { id: `direct-${campaignId}`, data: { campaignId } };
};

module.exports = { scrapeQueue, enqueueScrapeJob };
