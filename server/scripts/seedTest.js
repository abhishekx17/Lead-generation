require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');

const seed = async () => {
  await connectDB();

  await Lead.deleteMany({});
  await Campaign.deleteMany({ name: 'Delhi Restaurants (Test)' });

  const campaign = await Campaign.create({
    name: 'Delhi Restaurants (Test)',
    location: 'Delhi',
    targetAudience: 'Restaurants',
    requiredLeads: 50,
    status: 'completed',
    totalLeads: 3,
    sheetUrl: 'https://docs.google.com/spreadsheets/d/example',
  });

  const leads = await Lead.insertMany([
    {
      campaignId: campaign._id,
      businessName: 'Spice Garden',
      email: 'contact@spicegarden.in',
      phone: '9876543210',
      website: 'https://spicegarden.in',
      address: 'Connaught Place, New Delhi',
      industry: 'Restaurants',
    },
    {
      campaignId: campaign._id,
      businessName: 'Urban Bites',
      email: 'hello@urbanbites.com',
      phone: '9123456780',
      website: 'https://urbanbites.com',
      address: 'Hauz Khas, New Delhi',
      industry: 'Restaurants',
    },
    {
      campaignId: campaign._id,
      businessName: 'Dilli Darbar',
      email: 'info@dillidarbar.in',
      phone: '9988776655',
      website: 'https://dillidarbar.in',
      address: 'Karol Bagh, New Delhi',
      industry: 'Restaurants',
    },
  ]);

  console.log(`Seeded campaign: ${campaign.name} (${campaign._id})`);
  console.log(`Seeded ${leads.length} leads`);
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
