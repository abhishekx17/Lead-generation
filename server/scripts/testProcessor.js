require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { processLeads, generateLeadSummary } = require('../services/dataProcessor');

const rawLeads = [
  {
    businessName: '  Spice Garden  ',
    email: 'contact@spicegarden.in',
    phone: '+91 98765-43210',
    website: 'https://spicegarden.in',
    address: 'Connaught Place, Delhi',
  },
  {
    businessName: 'Duplicate Email Co',
    email: 'contact@spicegarden.in',
    phone: '9123456789',
    website: '',
    address: '',
  },
  {
    businessName: 'No Contact',
    email: '',
    phone: '',
    website: 'https://nope.com',
    address: '',
  },
  {
    businessName: 'Phone Only',
    email: '',
    phone: '9988776655',
    website: '',
    address: 'Mumbai',
  },
  {
    businessName: 'Bad Email',
    email: 'not-an-email',
    phone: '9876543210',
    website: '',
    address: '',
  },
];

const cleaned = processLeads(rawLeads, 'Restaurants');
const summary = generateLeadSummary(cleaned);

console.log('--- Cleaned Leads ---');
console.log(JSON.stringify(cleaned, null, 2));
console.log('\n--- Summary ---');
console.log(summary);
