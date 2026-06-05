require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { exportLeadsToSheet } = require('../services/sheets');

const sampleLeads = [
  {
    businessName: 'Spice Garden',
    email: 'contact@spicegarden.in',
    phone: '9876543210',
    website: 'https://spicegarden.in',
    address: 'Connaught Place, New Delhi',
    industry: 'Restaurants',
  },
  {
    businessName: 'Urban Bites',
    email: 'hello@urbanbites.com',
    phone: '9123456780',
    website: 'https://urbanbites.com',
    address: 'Hauz Khas, New Delhi',
    industry: 'Restaurants',
  },
];

const run = async () => {
  const sheetTitle = process.argv[2] || `Test Export ${new Date().toISOString().slice(0, 16)}`;

  try {
    const result = await exportLeadsToSheet(process.env.SPREADSHEET_ID, sheetTitle, sampleLeads);
    console.log('Export successful');
    console.log('Sheet title:', result.sheetTitle);
    console.log('Leads written:', result.leadCount);
    console.log('URL:', result.sheetUrl);
    process.exit(0);
  } catch (error) {
    console.error('Sheets export failed:', error.message);
    process.exit(1);
  }
};

run();
