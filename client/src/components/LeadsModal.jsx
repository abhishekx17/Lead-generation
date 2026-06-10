import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Download01Icon,
  Search01Icon,
  UserGroupIcon,
} from 'hugeicons-react';
import { getLeads } from '../api';
import Button from './ui/Button';

export default function LeadsModal({ campaign, onClose }) {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    setPage(1);
    setSearch('');
    setSearchInput('');
  }, [campaign?._id]);

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
    fetchLeads();
  }, [fetchLeads]);

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

  if (!campaign) return null;

  const progress = campaign.requiredLeads
    ? Math.min(((campaign.totalLeads || 0) / campaign.requiredLeads) * 100, 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="flex h-[80vh] min-h-[500px] max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-2xl">
        {/* Header */}
        <div className="relative border-b border-hairline bg-surface-soft px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="caption-uppercase text-xs font-semibold tracking-wider text-muted">Campaign leads</p>
              <h2 className="text-xl font-semibold tracking-tight text-ink">{campaign.name}</h2>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-muted">
                  <UserGroupIcon size={14} className="text-muted" />
                  <span className="font-semibold text-ink">{pagination.total}</span> leads
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
            </div>
            <div className="flex items-center gap-2">
              {campaign.sheetUrl && (
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
            <p className="py-16 text-center text-error">{error}</p>
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
          <div className="flex items-center justify-between border-t border-hairline bg-surface-soft px-6 py-4">
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
      </div>
    </div>
  );
}
