const Queue = require('bull');
const logger = require('../utils/logger');
const { runScrapePipeline } = require('../services/scrapePipeline');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const scrapeQueue = new Queue('scrape-leads', REDIS_URL, {
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
  logger.error(`Scrape job ${job?.id} failed: ${error.message}`, { stack: error.stack });
});

scrapeQueue.on('error', (error) => {
  logger.error(`Scrape queue error: ${error.message}`, { stack: error.stack });
});

const enqueueScrapeJob = async (campaignId) => {
  const job = await scrapeQueue.add(
    { campaignId: campaignId.toString() },
    { jobId: `scrape-${campaignId}` }
  );
  return job;
};

module.exports = { scrapeQueue, enqueueScrapeJob };
