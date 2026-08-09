import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
const POLL_INTERVAL = 10_000; // 10 seconds

const AUDIT_ACTIONS = [
  'campaign.create', 'campaign.delete', 'campaign.scrape_trigger',
  'email_account.connect', 'email_account.disconnect', 'outreach.send',
  'chat.query', 'lead.export', 'member.invite', 'member.role_change',
];

const ACTION_BADGES = {
  'campaign.create': 'badge-green',
  'campaign.delete': 'badge-red',
  'campaign.scrape_trigger': 'badge-blue',
  'lead.export': 'badge-purple',
  'chat.query': 'badge-yellow',
  'member.invite': 'badge-cyan',
  'member.role_change': 'badge-orange',
};

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ActionBadge({ action }) {
  const cls = ACTION_BADGES[action] ?? 'badge-gray';
  return <span className={`admin-badge ${cls}`}>{action}</span>;
}

function MetadataModal({ log, onClose }) {
  if (!log) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box admin-meta-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Audit Log Detail</h3>
          <button id="admin-meta-modal-close" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-meta-grid">
          <div className="admin-meta-row"><span>ID</span><code>{log.id}</code></div>
          <div className="admin-meta-row"><span>Action</span><ActionBadge action={log.action} /></div>
          <div className="admin-meta-row"><span>Entity Type</span><code>{log.entityType}</code></div>
          <div className="admin-meta-row"><span>Entity ID</span><code>{log.entityId ?? '—'}</code></div>
          <div className="admin-meta-row"><span>User</span><span>{log.userEmail} ({log.userName})</span></div>
          <div className="admin-meta-row"><span>Organization</span><span>{log.organizationName}</span></div>
          <div className="admin-meta-row"><span>IP Address</span><code>{log.ipAddress ?? '—'}</code></div>
          <div className="admin-meta-row"><span>Timestamp</span><span>{formatDate(log.createdAt)}</span></div>
          <div className="admin-meta-row admin-meta-row--full">
            <span>Metadata</span>
            <pre className="admin-meta-pre">{JSON.stringify(log.metadata, null, 2)}</pre>
          </div>
          {log.userAgent && (
            <div className="admin-meta-row admin-meta-row--full">
              <span>User Agent</span>
              <code className="admin-meta-ua">{log.userAgent}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Organizations Tab ─────────────────────────────────────────────────────────
function OrgsTab() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/admin/organizations`, {
        params: { page, limit },
        withCredentials: true,
      });
      setOrgs(res.data.organizations);
      setTotal(res.data.pagination.total);
    } catch {
      // handled by auth guard
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const columnHelper = createColumnHelper();
  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'Organization',
      cell: (info) => (
        <div className="admin-org-cell">
          <div className="admin-org-avatar">{info.getValue().slice(0, 2).toUpperCase()}</div>
          <div>
            <div className="admin-org-name">{info.getValue()}</div>
            <div className="admin-org-slug">/{info.row.original.slug}</div>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('memberCount', {
      header: 'Members',
      cell: (info) => <span className="admin-count">{info.getValue()}</span>,
    }),
    columnHelper.accessor('lastActivity', {
      header: 'Last Activity',
      cell: (info) => info.getValue() ? formatDate(info.getValue()) : <span className="admin-none">No activity</span>,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: (info) => formatDate(info.getValue()),
    }),
  ], []);

  const table = useReactTable({
    data: orgs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) return <div className="admin-loading"><div className="admin-spinner" /></div>;

  return (
    <div className="admin-tab-content">
      <div className="admin-table-wrap">
        <table className="admin-table" id="admin-orgs-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className={h.column.getCanSort() ? 'sortable' : ''}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() === 'asc' ? ' ↑' : h.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="admin-pagination">
        <button
          id="admin-orgs-prev"
          className="admin-page-btn"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >← Prev</button>
        <span className="admin-page-info">Page {page} · {total} orgs</span>
        <button
          id="admin-orgs-next"
          className="admin-page-btn"
          disabled={page * limit >= total}
          onClick={() => setPage((p) => p + 1)}
        >Next →</button>
      </div>
    </div>
  );
}

// ── Audit Feed Tab ────────────────────────────────────────────────────────────
function AuditFeedTab({ allOrgs }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Filters
  const [filters, setFilters] = useState({
    organizationId: '',
    action: '',
    userId: '',
    from: '',
    to: '',
  });

  const fetchLogs = useCallback(async () => {
    try {
      const params = { page, limit };
      if (filters.organizationId) params.organizationId = filters.organizationId;
      if (filters.action) params.action = filters.action;
      if (filters.userId) params.userId = filters.userId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const res = await axios.get(`${API}/api/admin/audit-logs`, {
        params,
        withCredentials: true,
      });
      setLogs(res.data.logs);
      setTotal(res.data.pagination.total);
    } catch {
      // handled by auth guard
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Poll every 10s
  useEffect(() => {
    const id = setInterval(fetchLogs, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchLogs]);

  const columnHelper = createColumnHelper();
  const columns = useMemo(() => [
    columnHelper.accessor('createdAt', {
      header: 'Time',
      cell: (info) => <span className="admin-time">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('action', {
      header: 'Action',
      cell: (info) => <ActionBadge action={info.getValue()} />,
    }),
    columnHelper.accessor('userEmail', {
      header: 'User',
      cell: (info) => (
        <div className="admin-user-cell">
          <span className="admin-user-name">{info.row.original.userName}</span>
          <span className="admin-user-email">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('organizationName', {
      header: 'Organization',
      cell: (info) => <span className="admin-org-pill">{info.getValue()}</span>,
    }),
    columnHelper.accessor('entityType', {
      header: 'Entity',
      cell: (info) => (
        <span>
          <code className="admin-entity">{info.getValue()}</code>
          {info.row.original.entityId && (
            <code className="admin-entity-id">#{info.row.original.entityId.slice(-6)}</code>
          )}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => (
        <button
          className="admin-detail-btn"
          id={`audit-detail-${row.original.id}`}
          onClick={() => setSelectedLog(row.original)}
        >
          Details
        </button>
      ),
    }),
  ], []);

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleFilter = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  return (
    <div className="admin-tab-content">
      {/* Filters */}
      <div className="admin-filters" id="audit-filters">
        <select
          id="filter-org"
          name="organizationId"
          className="admin-filter-select"
          value={filters.organizationId}
          onChange={handleFilter}
        >
          <option value="">All organizations</option>
          {allOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>

        <select
          id="filter-action"
          name="action"
          className="admin-filter-select"
          value={filters.action}
          onChange={handleFilter}
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <input
          id="filter-user"
          name="userId"
          type="text"
          placeholder="User ID…"
          className="admin-filter-input"
          value={filters.userId}
          onChange={handleFilter}
        />

        <input
          id="filter-from"
          name="from"
          type="date"
          className="admin-filter-input"
          value={filters.from}
          onChange={handleFilter}
          title="From date"
        />

        <input
          id="filter-to"
          name="to"
          type="date"
          className="admin-filter-input"
          value={filters.to}
          onChange={handleFilter}
          title="To date"
        />

        <button
          id="filter-reset"
          className="admin-filter-reset"
          onClick={() => { setFilters({ organizationId: '', action: '', userId: '', from: '', to: '' }); setPage(1); }}
        >
          Reset
        </button>

        <span className="admin-live-badge">
          <span className="admin-live-dot" /> Live
        </span>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" /></div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table" id="admin-audit-table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        onClick={h.column.getToggleSortingHandler()}
                        className={h.column.getCanSort() ? 'sortable' : ''}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === 'asc' ? ' ↑' : h.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="admin-audit-row"
                    onClick={() => setSelectedLog(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={6} className="admin-empty">No audit logs match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <button
              id="admin-audit-prev"
              className="admin-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >← Prev</button>
            <span className="admin-page-info">Page {page} · {total} entries</span>
            <button
              id="admin-audit-next"
              className="admin-page-btn"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >Next →</button>
          </div>
        </>
      )}

      <MetadataModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function Admin() {
  const { user, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('orgs');
  const [allOrgs, setAllOrgs] = useState([]);

  useEffect(() => {
    axios
      .get(`${API}/api/admin/organizations`, {
        params: { limit: 100 },
        withCredentials: true,
      })
      .then((res) => setAllOrgs(res.data.organizations ?? []))
      .catch(() => {});
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="admin-forbidden">
        <div className="admin-forbidden-icon">🔒</div>
        <h2>Access Restricted</h2>
        <p>This area is only accessible to super admins.</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <div className="admin-header-badge">Super Admin</div>
          <h1 className="admin-title">Platform Dashboard</h1>
          <p className="admin-subtitle">Cross-organization visibility and audit trail</p>
        </div>
        <div className="admin-header-right">
          <div className="admin-user-chip">
            <div className="admin-user-avatar">
              {user?.name?.slice(0, 2).toUpperCase() ?? '??'}
            </div>
            <span>{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="admin-tabs">
        <button
          id="admin-tab-orgs"
          className={`admin-tab-btn ${activeTab === 'orgs' ? 'admin-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('orgs')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/>
            <rect x="10" y="2" width="6" height="6" rx="1.5" fill="currentColor"/>
            <rect x="2" y="10" width="6" height="6" rx="1.5" fill="currentColor"/>
            <rect x="10" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/>
          </svg>
          Organizations
        </button>
        <button
          id="admin-tab-audit"
          className={`admin-tab-btn ${activeTab === 'audit' ? 'admin-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 5h12M3 9h8M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Audit Feed
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'orgs' ? (
        <OrgsTab />
      ) : (
        <AuditFeedTab allOrgs={allOrgs} />
      )}
    </div>
  );
}
