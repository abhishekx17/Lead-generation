import { useCallback, useEffect, useState } from 'react';
import { getLeads } from '../api';

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

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  if (!campaign) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{campaign.name}</h2>
            <p className="text-sm text-slate-400">{pagination.total} leads</p>
          </div>
          <div className="flex items-center gap-3">
            {campaign.sheetUrl && (
              <a
                href={campaign.sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
              >
                Export to Sheets
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        <div className="border-b border-slate-700 px-6 py-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email…"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
            >
              Search
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <p className="text-center text-slate-400">Loading leads…</p>
          ) : error ? (
            <p className="text-center text-red-400">{error}</p>
          ) : leads.length === 0 ? (
            <p className="text-center text-slate-400">No leads found.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Phone</th>
                  <th className="pb-2 pr-4 font-medium">Website</th>
                  <th className="pb-2 font-medium">Address</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead._id} className="border-b border-slate-800 text-slate-300">
                    <td className="py-2.5 pr-4">{lead.businessName || '—'}</td>
                    <td className="py-2.5 pr-4">{lead.email || '—'}</td>
                    <td className="py-2.5 pr-4">{lead.phone || '—'}</td>
                    <td className="py-2.5 pr-4">
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                          Link
                        </a>
                      ) : '—'}
                    </td>
                    <td className="py-2.5">{lead.address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700 px-6 py-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">
              Page {page} of {pagination.pages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
