require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const { embedLeads } = require('../services/embeddings');
const { queryLeads, queryAllCampaigns } = require('../services/rag');

const run = async () => {
  await connectDB();

  const campaign = await Campaign.findOne({ name: 'Delhi Restaurants (Test)' });
  if (!campaign) {
    console.error('Run npm run seed first to create test campaign.');
    process.exit(1);
  }

  const leads = await Lead.find({ campaignId: campaign._id }).lean();
  console.log(`Embedding ${leads.length} leads for "${campaign.name}"...`);

  const embedResult = await embedLeads(leads, campaign.name, campaign._id.toString());
  console.log('Embedded:', embedResult);

  const question = process.argv[2] || 'How many leads do I have and what are their emails?';
  console.log('\nQuestion:', question);

  const answer = await queryLeads(question, campaign._id.toString());
  console.log('\nAnswer (single campaign):\n', answer);

  const allAnswer = await queryAllCampaigns(question);
  console.log('\nAnswer (all campaigns):\n', allAnswer);

  process.exit(0);
};

run().catch((error) => {
  console.error('RAG test failed:', error.message);
  process.exit(1);
});
