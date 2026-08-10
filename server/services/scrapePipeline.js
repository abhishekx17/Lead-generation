const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const logger = require('../utils/logger');
const { scrapeLeads, ScraperError } = require('./scraper');
const { processLeads, isValidEmail } = require('./dataProcessor');
const { exportLeadsToSheet } = require('./sheets');
const { embedLeads } = require('./embeddings');

const saveLeads = async (campaign, cleanedLeads) => {
  const saved = [];

  for (const lead of cleanedLeads) {
    if (lead.email && !isValidEmail(lead.email)) continue;

    try {
      const doc = await Lead.create({
        campaignId: campaign._id,
        organizationId: campaign.organizationId,
        businessName: lead.businessName,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        address: lead.address,
        industry: lead.industry,
        isValid: lead.isValid,
      });
      saved.push(doc);
    } catch (error) {
      if (error.code === 11000) continue;
      throw error;
    }
  }

  return saved;
};

/**
 * Run the full scrape → clean → save → sheets → embed pipeline.
 */
const runScrapePipeline = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  logger.info(`Scraping started for campaign "${campaign.name}" (${campaignId})`);

  try {
    const rawLeads = await scrapeLeads({
      location: campaign.location,
      targetAudience: campaign.targetAudience,
      requiredLeads: campaign.requiredLeads,
      searchQuery: campaign.searchQuery,
    });

    const cleanedLeads = processLeads(rawLeads, campaign.targetAudience);
    const savedLeads = await saveLeads(campaign, cleanedLeads);

    if (!savedLeads.length) {
      throw new ScraperError('No valid leads remained after cleaning and validation', 'EMPTY_RESULTS');
    }

    let sheetUrl = campaign.sheetUrl || '';

    try {
      const sheetTitle = `${campaign.name} - ${new Date().toISOString().slice(0, 10)}`;
      const exportResult = await exportLeadsToSheet(
        process.env.SPREADSHEET_ID,
        sheetTitle,
        savedLeads.map((l) => l.toObject())
      );
      sheetUrl = exportResult.sheetUrl;
    } catch (sheetError) {
      logger.warn(`Google Sheets export failed for "${campaign.name}": ${sheetError.message}`);
    }

    try {
      await embedLeads(
        savedLeads.map((l) => l.toObject()),
        campaign.name,
        campaign._id.toString()
      );
    } catch (embedError) {
      logger.warn(`Embedding failed for "${campaign.name}": ${embedError.message}`);
    }

    campaign.status = 'completed';
    campaign.totalLeads = savedLeads.length;
    campaign.sheetUrl = sheetUrl;
    await campaign.save();

    logger.info(
      `Scraping completed for "${campaign.name}": ${savedLeads.length} leads saved`
    );

    return {
      totalLeads: savedLeads.length,
      sheetUrl,
      campaign,
    };
  } catch (error) {
    campaign.status = 'failed';
    await campaign.save();

    logger.error(
      `Scraping failed for "${campaign.name}": ${error.message}`,
      { stack: error.stack }
    );

    throw error;
  }
};

module.exports = { runScrapePipeline, saveLeads };
