import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Add01Icon,
  Cancel01Icon,
  Download01Icon,
  Location01Icon,
  UserGroupIcon,
  Search01Icon,
  Delete02Icon,
  EyeIcon,
  Radar01Icon,
} from 'hugeicons-react';
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
import { gsap } from 'gsap';

const emptyForm = { name: '', location: '', targetAudience: '', searchQuery: '', requiredLeads: 50 };

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
  const [confirmAction, setConfirmAction] = useState(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setConfirmAction(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // GSAP animation for campaign cards
  useEffect(() => {
    if (!loading && campaigns.length > 0) {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(
          '.campaign-card-anim',
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
        );
      }
    }
  }, [loading, campaigns]);

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

  const handleDelete = (id, name) => {
    setConfirmAction({
      title: 'Delete campaign',
      message: `Delete campaign "${name}" and all its leads?`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteCampaign(id);
          await loadCampaigns();
        } catch (err) {
          setError(err.message);
        }
      },
    });
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Campaigns"
        title="Create and manage lead campaigns"
        description="Define your target audience, scrape leads automatically, and export results to Google Sheets."
        action={
          <Button icon={Add01Icon} onClick={() => setShowModal(true)} disabled={submitting}>
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
              <Search01Icon size={24} className="text-brand-ochre" />
            </div>
            <p className="text-lg font-medium text-ink">No campaigns yet</p>
            <p className="mt-1 text-muted">Create one to start scraping leads.</p>
            <Button icon={Add01Icon} className="mt-6" onClick={() => setShowModal(true)}>
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

            // Inside the campaigns.map() — replace the <article> block only

            return (
              <article
                key={campaign._id}
                className={`campaign-card-anim opacity-0 group flex flex-col overflow-hidden rounded-3xl ${variant.bg} ${variant.border} ${variant.accentBorder} ${variant.text} transition-all duration-200`}
              >
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold leading-snug">{campaign.name}</h3>
                    <StatusBadge status={campaign.status} surface={variant.surface} />
                  </div>

                  <ul className={`mt-5 space-y-2.5 text-sm ${variant.muted}`}>
                    <li className="flex items-center gap-2.5">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${variant.iconBg} ${variant.iconColor}`}>
                        <Location01Icon size={14} />
                      </div>
                      <span>{campaign.location}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${variant.iconBg} ${variant.iconColor}`}>
                        <Search01Icon size={14} />
                      </div>
                      <span>{campaign.targetAudience}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${variant.iconBg} ${variant.iconColor}`}>
                        <UserGroupIcon size={14} />
                      </div>
                      <span className="font-semibold">{campaign.totalLeads || 0}</span>
                      <span className="opacity-60">/ {campaign.requiredLeads} leads</span>
                    </li>
                  </ul>

                  {/* Progress bar */}
                  <div className="mt-5">
                    <div className={`h-1.5 w-full overflow-hidden rounded-full ${variant.progressBg}`}>
                      <div
                        className={`h-full rounded-full ${variant.progressFill} transition-all duration-700 ease-out`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className={`mt-6 flex flex-wrap gap-2 border-t pt-5 ${variant.divider}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedCampaign(campaign)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${variant.badge}`}
                    >
                      <EyeIcon size={14} />
                      View Leads
                    </button>
                    {campaign.sheetUrl && (
                      <a
                        href={campaign.sheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${variant.badge}`}
                      >
                        <Download01Icon size={14} />
                        View Sheet
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(campaign._id, campaign.name)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ml-auto ${variant.deleteBtn}`}
                    >
                      <Delete02Icon size={14} />
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
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 cursor-default"
              onClick={() => setShowModal(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="New campaign"
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-hairline-strong bg-canvas"
            >
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="absolute top-5 right-5 rounded-xl p-2 text-muted transition-colors hover:bg-surface-soft hover:text-ink cursor-pointer"
                aria-label="Close"
              >
                <Cancel01Icon size={18} />
              </button>

              <div className="border-b border-hairline bg-surface-soft px-8 pt-7 pb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal text-white mb-3">
                  <Radar01Icon size={20} />
                </div>
                <p className="caption-uppercase text-xs font-semibold tracking-wider text-muted">New campaign</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">
                  Launch a lead scrape
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="px-8 pb-8 pt-6 space-y-4">
                <Input
                  label="Campaign Name"
                  required
                  icon={Radar01Icon}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Delhi Restaurants"
                />
                <Input
                  label="Location"
                  required
                  icon={Location01Icon}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Delhi"
                />
                <Input
                  label="Target Audience"
                  required
                  icon={Search01Icon}
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  placeholder="Restaurants"
                />
                <Input
                  label="Custom Search Query (optional)"
                  icon={Search01Icon}
                  value={form.searchQuery}
                  onChange={(e) => setForm({ ...form, searchQuery: e.target.value })}
                  placeholder="best rooftop restaurants delhi contact"
                />
                <Input
                  label="Required Leads (10–1000)"
                  required
                  type="number"
                  min={10}
                  max={1000}
                  icon={UserGroupIcon}
                  value={form.requiredLeads}
                  onChange={(e) => setForm({ ...form, requiredLeads: e.target.value })}
                />
                <div className="flex justify-end gap-2 pt-4 border-t border-hairline mt-6">
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
          </div>,
          document.body
        )
      }

      {/* Confirm Dialog */}
      {confirmAction &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 cursor-default"
              onClick={() => setConfirmAction(null)}
            />
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label={confirmAction.title}
              className="relative w-full max-w-sm rounded-2xl border border-hairline-strong bg-canvas p-6"
            >
              <h3 className="text-lg font-semibold text-ink">{confirmAction.title}</h3>
              <p className="mt-2 text-sm text-muted">{confirmAction.message}</p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="rounded-lg border border-hairline bg-canvas px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-soft cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { onConfirm } = confirmAction;
                    setConfirmAction(null);
                    onConfirm();
                  }}
                  className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 cursor-pointer"
                >
                  {confirmAction.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {selectedCampaign &&
        createPortal(
          <LeadsModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />,
          document.body
        )
      }
    </div>
  );
}
