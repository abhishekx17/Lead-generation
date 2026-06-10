import { useCallback, useEffect, useState } from 'react';
import {
  Add,
  DocumentDownload,
  Location,
  People,
  SearchNormal1,
  Trash,
  Eye,
  Radar2,
} from 'iconsax-reactjs';
import {
  createCampaign,
  deleteCampaign,
  getCampaigns,
  pollCampaignUntilDone,
  scrapeLeads,
} from '../api';
import LeadsModal from '../components/LeadsModal';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import { getBrandVariant } from '../lib/brandColors';

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
      setScrapingMessage(
        'Scraping leads in the background — polling for status every 5 seconds.',
      );

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
    <div className="space-y-10">
      <PageHeader
        eyebrow="Campaigns"
        title="Create and manage lead campaigns"
        description="Define your target audience, scrape leads automatically, and export results to Google Sheets."
        action={
          <Button icon={Add} onClick={() => setShowModal(true)} disabled={submitting}>
            New Campaign
          </Button>
        }
      />

      {error && (
        <Alert type="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {scrapingMessage && (
        <Alert type="info">
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
            {scrapingMessage}
          </span>
        </Alert>
      )}

      {toast && (
        <div className="toast-enter relative overflow-hidden">
          <Alert type="success" dismissible onDismiss={() => setToast(null)}>
            {toast.message}
            {toast.sheetUrl && (
              <a
                href={toast.sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-2 font-semibold text-ink underline underline-offset-2"
              >
                View in Google Sheets
              </a>
            )}
          </Alert>
          <div className="absolute bottom-0 left-0 h-0.5 bg-success/40 progress-bar-animate" />
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-56 rounded-2xl" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-hairline bg-surface-soft py-20 text-center">
          <div className="absolute inset-0 dot-pattern opacity-20 pointer-events-none" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-ochre/15 animate-float">
              <SearchNormal1 size={32} variant="Bold" className="text-brand-ochre" />
            </div>
            <p className="text-lg font-medium text-ink">No campaigns yet</p>
            <p className="mt-1 text-muted">Create one to start scraping leads.</p>
            <Button icon={Add} className="mt-6" onClick={() => setShowModal(true)}>
              Create Campaign
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign, index) => {
            const variant = getBrandVariant(index);
            const progress = campaign.requiredLeads
              ? Math.min(((campaign.totalLeads || 0) / campaign.requiredLeads) * 100, 100)
              : 0;

            return (
              <article
                key={campaign._id}
                className={`animate-fade-in-up delay-${(index % 6) + 1} group flex flex-col overflow-hidden rounded-2xl ${variant.bg} ${variant.border} ${variant.accentBorder} ${variant.text} hover-lift shadow-[0_1px_3px_rgba(10,10,10,0.04)]`}
              >
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold leading-snug text-ink">{campaign.name}</h3>
                    <StatusBadge status={campaign.status} />
                  </div>

                  <ul className={`mt-4 space-y-2 text-sm ${variant.muted}`}>
                    <li className="flex items-center gap-2.5">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md ${variant.iconBg}`}>
                        <Location size={13} variant="Bold" />
                      </div>
                      <span>{campaign.location}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md ${variant.iconBg}`}>
                        <SearchNormal1 size={13} variant="Bold" />
                      </div>
                      <span>{campaign.targetAudience}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md ${variant.iconBg}`}>
                        <People size={13} variant="Bold" />
                      </div>
                      <span className="font-medium text-ink">{campaign.totalLeads || 0}</span>
                      <span className="text-muted-soft">/ {campaign.requiredLeads} leads</span>
                    </li>
                  </ul>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className={`h-1.5 w-full overflow-hidden rounded-full ${variant.progressBg}`}>
                      <div
                        className={`h-full rounded-full ${variant.progressFill} transition-all duration-700 ease-out`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-5">
                    <button
                      type="button"
                      onClick={() => setSelectedCampaign(campaign)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${variant.badge}`}
                    >
                      <Eye size={14} variant="Bold" />
                      View Leads
                    </button>
                    {campaign.sheetUrl && (
                      <a
                        href={campaign.sheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${variant.badge}`}
                      >
                        <DocumentDownload size={14} variant="Bold" />
                        View Sheet
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(campaign._id, campaign.name)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-error/8 px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/15"
                    >
                      <Trash size={14} variant="Bold" />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* New Campaign Modal */}
      {showModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="modal-content w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-2xl">
            <div className="border-b border-hairline bg-surface-soft px-8 pt-7 pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary mb-3">
                <Radar2 size={20} variant="Bold" />
              </div>
              <p className="caption-uppercase text-muted">New campaign</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">
                Launch a lead scrape
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="px-8 pb-8 pt-6 space-y-4">
              <Input
                label="Campaign Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Delhi Restaurants"
              />
              <Input
                label="Location"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Delhi"
              />
              <Input
                label="Target Audience"
                required
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                placeholder="Restaurants"
              />
              <Input
                label="Required Leads (10–1000)"
                required
                type="number"
                min={10}
                max={1000}
                value={form.requiredLeads}
                onChange={(e) => setForm({ ...form, requiredLeads: e.target.value })}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create & Scrape'}
                </Button>
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
