require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { scrapeLeads, ScraperError } = require('../services/scraper');
const { processLeads, generateLeadSummary } = require('../services/dataProcessor');

const run = async () => {
  const params = {
    location: process.argv[2] || 'Delhi',
    targetAudience: process.argv[3] || 'Restaurants',
    requiredLeads: Number(process.argv[4]) || 5,
  };

  console.log('Starting scrape with:', params);

  try {
    const raw = await scrapeLeads(params);
    console.log(`\nRaw leads scraped: ${raw.length}`);

    const cleaned = processLeads(raw, params.targetAudience);
    const summary = generateLeadSummary(cleaned);

    console.log('\n--- Cleaned Leads ---');
    console.log(JSON.stringify(cleaned, null, 2));
    console.log('\n--- Summary ---');
    console.log(summary);
    process.exit(0);
  } catch (error) {
    if (error instanceof ScraperError) {
      console.error(`Scraper error [${error.code}]:`, error.message);
    } else {
      console.error('Unexpected error:', error.message);
    }
    process.exit(1);
  }
};

run();
