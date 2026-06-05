import { useCallback, useEffect, useState } from 'react';
import {
  createCampaign,
  deleteCampaign,
  getCampaigns,
  pollCampaignUntilDone,
  scrapeLeads,
} from '../api';
import LeadsModal from '../components/LeadsModal';
import StatusBadge from '../components/StatusBadge';

const emptyForm = { name: '', location: '', targetAudience: '', requiredLeads: 50 };

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [scrapingMessage, setScrapingMessage] = useState('');
  const [toast, setToast] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await getCampaigns();
      setCampaigns(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setScrapingMessage('');
    setError('');

    try {
      const campaign = await createCampaign({
        ...form,
        requiredLeads: Number(form.requiredLeads),
      });

      setShowModal(false);
      setForm(emptyForm);
      setScrapingMessage('Scraping leads in the background… polling for status every 5 seconds.');

      await scrapeLeads(campaign._id);
      const result = await pollCampaignUntilDone(campaign._id);

      setToast({
        type: 'success',
        message: `Scraped ${result.totalLeads} leads successfully!`,
        sheetUrl: result.sheetUrl,
      });
      await loadCampaigns();
    } catch (err) {
      setError(err.message);
      await loadCampaigns();
    } finally {
      setSubmitting(false);
      setScrapingMessage('');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete campaign "${name}" and all its leads?`)) return;

    try {
      await deleteCampaign(id);
      await loadCampaigns();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Campaigns</h2>
          <p className="text-slate-400">Create and manage lead generation campaigns</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          + New Campaign
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {scrapingMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          {scrapingMessage}
        </div>
      )}

      {toast && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {toast.message}
          {toast.sheetUrl && (
            <a
              href={toast.sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-2 font-medium text-blue-400 underline"
            >
              View in Google Sheets
            </a>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
          <p className="text-slate-400">No campaigns yet. Create one to start scraping leads.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign._id}
              className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white">{campaign.name}</h3>
                <StatusBadge status={campaign.status} />
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-400">
                <p>📍 {campaign.location}</p>
                <p>🎯 {campaign.targetAudience}</p>
                <p>👥 {campaign.totalLeads || 0} / {campaign.requiredLeads} leads</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCampaign(campaign)}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                >
                  View Leads
                </button>
                {campaign.sheetUrl && (
                  <a
                    href={campaign.sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-blue-400 hover:bg-slate-700"
                  >
                    View Sheet
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(campaign._id, campaign.name)}
                  className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">New Campaign</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Campaign Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Delhi Restaurants"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Location</label>
                <input
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Delhi"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Target Audience</label>
                <input
                  required
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Restaurants"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Required Leads (10–1000)</label>
                <input
                  required
                  type="number"
                  min={10}
                  max={1000}
                  value={form.requiredLeads}
                  onChange={(e) => setForm({ ...form, requiredLeads: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  Create &amp; Scrape
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCampaign && (
        <LeadsModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />
      )}
    </div>
  );
}
