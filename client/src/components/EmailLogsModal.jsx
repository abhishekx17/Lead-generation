import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cancel01Icon, Mail01Icon } from 'hugeicons-react';
import { getEmailAccountLogs } from '../api';
import StatusBadge from './StatusBadge';
import Alert from './ui/Alert';

export default function EmailLogsModal({ account, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getEmailAccountLogs(account._id)
      .then(setLogs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [account]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Map email log status to status badge status
  const mapStatus = (status) => {
    if (status === 'queued') return 'pending';
    if (status === 'sent') return 'completed';
    return 'failed'; // failed or bounced
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 rounded-xl p-2 text-muted transition-colors hover:bg-surface-soft hover:text-ink cursor-pointer"
          aria-label="Close"
        >
          <Cancel01Icon size={18} />
        </button>

        {/* Modal Header */}
        <div className="border-b border-hairline bg-surface-soft px-8 pt-7 pb-5 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal text-white mb-3">
            <Mail01Icon size={20} />
          </div>
          <p className="caption-uppercase text-xs font-semibold tracking-wider text-muted">Logs</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            Outreach Logs for {account.email}
          </h3>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {error && <Alert type="error" className="mb-4">{error}</Alert>}

          {loading ? (
            <div className="space-y-4 py-8">
              <div className="skeleton h-8 w-full rounded" />
              <div className="skeleton h-8 w-full rounded" />
              <div className="skeleton h-8 w-full rounded" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-soft text-muted">
                <Mail01Icon size={20} />
              </div>
              <p className="text-base font-semibold text-ink">No logs found</p>
              <p className="mt-1 text-sm text-muted">Outreach emails sent from this account will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-hairline bg-canvas">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-surface-soft text-muted">
                    <th className="px-5 py-3.5 caption-uppercase text-[11px] font-semibold tracking-wider">Recipient</th>
                    <th className="px-5 py-3.5 caption-uppercase text-[11px] font-semibold tracking-wider">Subject</th>
                    <th className="px-5 py-3.5 caption-uppercase text-[11px] font-semibold tracking-wider">Status</th>
                    <th className="px-5 py-3.5 caption-uppercase text-[11px] font-semibold tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log._id}
                      className="border-b border-hairline/60 last:border-0 hover:bg-surface-soft/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink">
                          {log.leadId?.businessName || 'Unknown Lead'}
                        </div>
                        <div className="text-xs text-muted">
                          {log.leadId?.email || 'N/A'}
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-xs truncate font-medium text-body">
                        {log.subject}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={mapStatus(log.status)} />
                          {log.errorMessage && (
                            <span className="text-[11px] text-danger font-medium max-w-xs truncate" title={log.errorMessage}>
                              {log.errorMessage}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString() : new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
