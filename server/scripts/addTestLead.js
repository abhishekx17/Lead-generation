require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');

async function run() {
  const args = process.argv.slice(2);
  const email = args[0];
  const name = args[1] || 'Test Recipient';
  const campaignName = args[2] || 'Test Outreach Campaign';

  if (!email) {
    console.log('\nUsage: node scripts/addTestLead.js <email> [name] [campaignName]\n');
    console.log('Example: node scripts/addTestLead.js friend@gmail.com "John Doe"\n');
    process.exit(1);
  }

  // Connect to DB
  await connectDB();

  try {
    // 1. Find or create campaign
    let campaign = await Campaign.findOne({ name: campaignName });
    if (!campaign) {
      console.log(`Campaign "${campaignName}" not found. Creating a new one...`);
      campaign = await Campaign.create({
        name: campaignName,
        location: 'Local',
        targetAudience: 'Testing',
        requiredLeads: 10,
        status: 'completed', // set to completed so it looks ready
      });
      console.log(`Created campaign with ID: ${campaign._id}`);
    } else {
      console.log(`Using existing campaign: "${campaignName}" (ID: ${campaign._id})`);
    }

    // 2. Add lead to campaign
    let lead = await Lead.findOne({ campaignId: campaign._id, email: email.toLowerCase() });
    if (lead) {
      console.log(`Lead with email "${email}" already exists in this campaign.`);
    } else {
      lead = await Lead.create({
        campaignId: campaign._id,
        businessName: name,
        email: email.toLowerCase(),
        phone: '123-456-7890',
        website: 'http://example.com',
        address: 'Test Address',
        industry: 'Testing',
        isValid: true,
      });
      console.log(`Successfully added lead "${name}" (${email}) to campaign!`);
    }

    // Update campaign lead count
    const count = await Lead.countDocuments({ campaignId: campaign._id });
    campaign.totalLeads = count;
    await campaign.save();
    console.log(`Campaign now has ${count} total leads.`);

    console.log('\nSuccess! Now open your app UI, go to Campaigns, click on your campaign, switch to the "Email Outreach" tab, select your connected Gmail account, and click Send!');
  } catch (err) {
    console.error('Error adding test lead:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

run();
