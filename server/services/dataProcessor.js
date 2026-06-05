const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const EMAIL_FIND_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

const isValidEmail = (email) => EMAIL_REGEX.test(email);

const normalizePhone = (phone) => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 10) return digits;
  return digits;
};

const trimLead = (lead) => ({
  businessName: (lead.businessName || '').trim(),
  email: (lead.email || '').trim().toLowerCase(),
  phone: normalizePhone(lead.phone || ''),
  website: (lead.website || '').trim(),
  address: (lead.address || '').trim(),
  industry: (lead.industry || '').trim(),
});

/**
 * Clean, validate, and deduplicate raw scraped leads.
 * @param {Array} rawLeads
 * @param {string} [targetAudience] - Used to tag the industry field
 * @returns {Array}
 */
const processLeads = (rawLeads, targetAudience = '') => {
  const seenEmails = new Set();
  const cleaned = [];

  for (const raw of rawLeads) {
    const lead = trimLead({ ...raw, industry: raw.industry || targetAudience });

    if (!lead.email && !lead.phone) continue;

    if (lead.email && !isValidEmail(lead.email)) {
      const match = lead.email.match(EMAIL_FIND_REGEX);
      lead.email = match && isValidEmail(match[0]) ? match[0] : '';
    }

    if (!lead.email && !lead.phone) continue;

    if (lead.email) {
      if (seenEmails.has(lead.email)) continue;
      seenEmails.add(lead.email);
    }

    lead.isValid = lead.email ? isValidEmail(lead.email) : true;
    cleaned.push(lead);
  }

  return cleaned;
};

/**
 * Generate summary stats for a leads array.
 * @param {Array} leads
 * @returns {{ total: number, withEmail: number, withPhone: number, withWebsite: number }}
 */
const generateLeadSummary = (leads) => ({
  total: leads.length,
  withEmail: leads.filter((l) => l.email && isValidEmail(l.email)).length,
  withPhone: leads.filter((l) => l.phone && l.phone.length >= 10).length,
  withWebsite: leads.filter((l) => l.website).length,
});

module.exports = { processLeads, generateLeadSummary, isValidEmail, normalizePhone };
