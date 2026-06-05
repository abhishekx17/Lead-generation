const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

export const getCampaigns = () => apiFetch('/api/campaigns');

export const getCampaign = (id) => apiFetch(`/api/campaigns/${id}`);

export const createCampaign = (body) =>
  apiFetch('/api/campaigns', { method: 'POST', body: JSON.stringify(body) });

export const deleteCampaign = (id) =>
  apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' });

export const scrapeLeads = (campaignId) =>
  apiFetch(`/api/leads/scrape/${campaignId}`, { method: 'POST' });

export const pollCampaignUntilDone = (campaignId, intervalMs = 5000, maxAttempts = 120) =>
  new Promise((resolve, reject) => {
    let attempts = 0;

    const poll = async () => {
      attempts += 1;

      try {
        const campaign = await getCampaign(campaignId);

        if (campaign.status === 'completed') {
          resolve(campaign);
          return;
        }

        if (campaign.status === 'failed') {
          reject(
            new Error('Scraping failed. The site may have blocked the request or returned no results.')
          );
          return;
        }

        if (attempts >= maxAttempts) {
          reject(new Error('Scraping timed out. Check campaign status later.'));
          return;
        }

        setTimeout(poll, intervalMs);
      } catch (err) {
        reject(err);
      }
    };

    poll();
  });

export const getLeads = (campaignId, { page = 1, limit = 50, search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  return apiFetch(`/api/leads/${campaignId}?${params}`);
};

export const sendChatMessage = (question, campaignId) =>
  apiFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ question, campaignId: campaignId || undefined }),
  });
