import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Download01Icon,
  Search01Icon,
  UserGroupIcon,
  Mail01Icon,
} from 'hugeicons-react';
import { getLeads, getEmailAccounts, sendOutreachCampaign } from '../api';
import Button from './ui/Button';
import Alert from './ui/Alert';

export default function LeadsModal({ campaign, onClose }) {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const limit = 50;

  // Outreach states
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' or 'outreach'
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('Quick question for {{businessName}}');
  const [bodyTemplate, setBodyTemplate] = useState('Hi {{businessName}},\n\nI noticed you are located in {{location}} and wanted to reach out regarding your {{industry}} business.\n\nAre you looking to generate more customers this month?\n\nBest regards,\nAbhishek');
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [outreachResult, setOutreachResult] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    setSearch('');
    setSearchInput('');
    setOutreachResult(null);
    setError('');
  }, [campaign?._id, activeTab]);

  const fetchLeads = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    setError('');
    try {
      const data = await getLeads(campaign._id, { page, limit, search });
      setLeads(data.leads);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [campaign, page, search]);

  useEffect(() => {
    if (activeTab === 'leads') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchLeads();
    }
  }, [fetchLeads, activeTab]);

  // Load connected email accounts when the outreach tab is opened
  useEffect(() => {
    if (activeTab === 'outreach') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      getEmailAccounts()
        .then((accounts) => {
          const connected = accounts.filter((acc) => acc.status === 'connected');
          setEmailAccounts(connected);
          if (connected.length > 0) {
            setSelectedAccountId(connected[0]._id);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleSendOutreach = async (e) => {
    e.preventDefault();
    if (!selectedAccountId) {
      setError('Please select a connected email account.');
      return;
    }

    setSendingOutreach(true);
    setError('');
    setOutreachResult(null);

    try {
      const res = await sendOutreachCampaign(campaign._id, {
        emailAccountId: selectedAccountId,
        subjectTemplate,
        bodyTemplate,
      });
      setOutreachResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingOutreach(false);
    }
  };

  if (!campaign) return null;

  const progress = campaign.requiredLeads
    ? Math.min(((campaign.totalLeads || 0) / campaign.requiredLeads) * 100, 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="flex h-[80vh] min-h-[500px] max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-hairline-strong bg-canvas">
        {/* Header */}
        <div className="relative border-b border-hairline bg-surface-soft px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="caption-uppercase text-xs font-semibold tracking-wider text-muted">Campaign outreach</p>
              <h2 className="text-xl font-semibold tracking-tight text-ink">{campaign.name}</h2>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-muted">
                  <UserGroupIcon size={14} className="text-muted" />
                  <span className="font-semibold text-ink">{campaign.totalLeads || 0}</span> leads
                </div>
                {/* Progress indicator */}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-strong">
                    <div
                      className="h-full rounded-full bg-brand-teal transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted font-semibold">{Math.round(progress)}%</span>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('leads')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'leads'
                      ? 'bg-brand-teal text-white'
                      : 'bg-canvas text-muted border border-hairline hover:bg-surface-soft hover:text-ink'
                  }`}
                >
                  Leads List
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('outreach')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'outreach'
                      ? 'bg-brand-teal text-white'
                      : 'bg-canvas text-muted border border-hairline hover:bg-surface-soft hover:text-ink'
                  }`}
                >
                  Email Outreach
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-start">
              {activeTab === 'leads' && campaign.sheetUrl && (
                <a href={campaign.sheetUrl} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm" icon={Download01Icon}>
                    Export
                  </Button>
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-muted transition-colors hover:bg-surface-soft hover:text-ink cursor-pointer"
                aria-label="Close"
              >
                <Cancel01Icon size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Body Content */}
        {activeTab === 'leads' ? (
          <>
            {/* Search bar */}
            <div className="border-b border-hairline px-6 py-4 bg-surface-soft/40">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search01Icon
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by name or email…"
                    className="h-11 w-full rounded-xl border border-hairline bg-canvas pl-10 pr-4 text-sm text-ink placeholder:text-muted-soft transition-all duration-200 focus:border-ink focus:outline-none"
                  />
                </div>
                <Button type="submit" variant="secondary" size="md">
                  Search
                </Button>
              </form>
            </div>

            {/* Table content */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {loading ? (
                <div className="space-y-3 py-8">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton h-12 rounded-lg" />
                  ))}
                </div>
              ) : error ? (
                <Alert type="error">{error}</Alert>
              ) : leads.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-soft animate-float">
                    <Search01Icon size={20} className="text-muted" />
                  </div>
                  <p className="text-muted">No leads found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[800px]">
                    <thead className="sticky top-0 bg-canvas z-10">
                      <tr className="border-b border-hairline text-muted bg-canvas">
                        <th className="pb-3 pr-4 caption-uppercase text-[11px] font-semibold tracking-wider bg-canvas">Name</th>
                        <th className="pb-3 pr-4 caption-uppercase text-[11px] font-semibold tracking-wider bg-canvas">Email</th>
                        <th className="pb-3 pr-4 caption-uppercase text-[11px] font-semibold tracking-wider bg-canvas">Phone</th>
                        <th className="pb-3 pr-4 caption-uppercase text-[11px] font-semibold tracking-wider bg-canvas">Website</th>
                        <th className="pb-3 caption-uppercase text-[11px] font-semibold tracking-wider bg-canvas">Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead._id} className="border-b border-hairline/60 text-body hover:bg-surface-soft/40 transition-colors">
                          <td className="py-3.5 pr-4 font-semibold text-ink">
                            {lead.businessName || '—'}
                          </td>
                          <td className="py-3.5 pr-4">
                            {lead.email ? (
                              <span className="rounded-lg bg-surface-soft border border-hairline px-2 py-0.5 text-xs font-semibold text-ink">
                                {lead.email}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-3.5 pr-4">{lead.phone || '—'}</td>
                          <td className="py-3.5 pr-4">
                            {lead.website ? (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-brand-teal/10 px-2.5 py-1 text-xs font-semibold text-brand-teal transition-colors hover:bg-brand-teal/20"
                              >
                                Visit
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3.5 max-w-[200px] truncate">{lead.address || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-hairline bg-surface-soft px-6 py-4 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ArrowLeft01Icon}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          page === pageNum
                            ? 'bg-primary text-on-primary'
                            : 'text-muted hover:bg-surface-soft hover:text-ink'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {pagination.pages > 5 && (
                    <span className="px-1 text-xs text-muted">…{pagination.pages}</span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ArrowRight01Icon}
                  iconPosition="right"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Email Outreach Tab Content */
          <div className="flex-1 overflow-auto p-8">
            {error && <Alert type="error" className="mb-4">{error}</Alert>}
            
            {outreachResult && (
              <Alert type="success" className="mb-6">
                <h4 className="font-semibold text-sm">Campaign outreach successfully initiated!</h4>
                <p className="text-xs mt-1">
                  Queued: <strong>{outreachResult.queuedCount}</strong> emails. 
                  {outreachResult.skippedDuplicates > 0 && ` Skipped ${outreachResult.skippedDuplicates} duplicates.`}
                </p>
              </Alert>
            )}

            {loading ? (
              <div className="space-y-4 py-8">
                <div className="skeleton h-10 w-48 rounded" />
                <div className="skeleton h-24 w-full rounded" />
              </div>
            ) : emailAccounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-hairline p-10 text-center bg-surface-soft">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                  <Mail01Icon size={20} />
                </div>
                <p className="text-base font-semibold text-ink">No connected email accounts</p>
                <p className="mt-1 text-sm text-muted mb-6">You must connect a Gmail account before setting up cold outreach templates.</p>
                <a href="/email-accounts">
                  <Button size="sm">Manage Email Accounts</Button>
                </a>
              </div>
            ) : (
              <form onSubmit={handleSendOutreach} className="space-y-5 max-w-2xl">
                <div>
                  <label htmlFor="emailAccountSelect" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Sender Gmail Account
                  </label>
                  <select
                    id="emailAccountSelect"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-hairline bg-canvas px-4 text-sm text-ink focus:border-brand-teal focus:outline-none"
                  >
                    {emailAccounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.email} (Usage: {acc.dailySendCount || 0} sent today)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="subjectTemplateInput" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Subject Line Template
                  </label>
                  <input
                    id="subjectTemplateInput"
                    type="text"
                    required
                    value={subjectTemplate}
                    onChange={(e) => setSubjectTemplate(e.target.value)}
                    placeholder="e.g. Quick question for {{businessName}}"
                    className="h-11 w-full rounded-xl border border-hairline bg-canvas px-4 text-sm text-ink focus:border-brand-teal focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="bodyTemplateTextarea" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Email Body Template
                  </label>
                  <textarea
                    id="bodyTemplateTextarea"
                    required
                    rows={8}
                    value={bodyTemplate}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                    placeholder="Write your email body template here..."
                    className="w-full rounded-xl border border-hairline bg-canvas p-4 text-sm text-ink focus:border-brand-teal focus:outline-none font-sans"
                  />
                  <div className="mt-2 rounded-xl bg-surface-soft p-3 text-xs text-muted space-y-1">
                    <p className="font-semibold text-ink">Personalization Variables:</p>
                    <p>Use template syntax double curly brackets (e.g. <code>{"{{variableName}}"}</code>) to insert lead details:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="bg-canvas border border-hairline rounded px-1.5 py-0.5 font-mono">{"{{businessName}}"}</span>
                      <span className="bg-canvas border border-hairline rounded px-1.5 py-0.5 font-mono">{"{{location}}"}</span>
                      <span className="bg-canvas border border-hairline rounded px-1.5 py-0.5 font-mono">{"{{industry}}"}</span>
                      <span className="bg-canvas border border-hairline rounded px-1.5 py-0.5 font-mono">{"{{email}}"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-hairline flex gap-3">
                  <Button type="submit" disabled={sendingOutreach || emailAccounts.length === 0}>
                    {sendingOutreach ? 'Queueing Outreach...' : 'Queue Cold Email Campaign'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
