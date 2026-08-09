import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Mail01Icon,
  Delete02Icon,
  EyeIcon,
  Clock01Icon,
} from 'hugeicons-react';
import { getEmailAccounts, disconnectEmailAccount } from '../api';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import EmailLogsModal from '../components/EmailLogsModal';
import { gsap } from 'gsap';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export default function EmailAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const loadAccounts = () => {
    setLoading(true);
    getEmailAccounts()
      .then(setAccounts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAccounts();

    // Check query parameters for OAuth results
    const success = searchParams.get('success');
    const email = searchParams.get('email');
    const oauthError = searchParams.get('error');

    if (success === 'true' && email) {
      setToast({
        type: 'success',
        message: `Successfully connected Google account: ${email}`,
      });
      // Clear URL params
      setSearchParams({}, { replace: true });
    } else if (oauthError) {
      setToast({
        type: 'error',
        message: `Google connection failed: ${decodeURIComponent(oauthError)}`,
      });
      // Clear URL params
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // GSAP animation for cards
  useEffect(() => {
    if (!loading && accounts.length > 0) {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(
          '.account-card-anim',
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
        );
      }
    }
  }, [loading, accounts]);

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Escape closes the confirm dialog
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setConfirmAction(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleConnect = () => {
    window.location.href = `${API_BASE}/api/auth/google/connect`;
  };

  const handleDisconnect = (id, email) => {
    setConfirmAction({
      title: 'Disconnect Gmail account',
      message: `Are you sure you want to disconnect Gmail account ${email}? This will revoke tokens.`,
      confirmLabel: 'Disconnect',
      onConfirm: async () => {
        try {
          await disconnectEmailAccount(id);
          setToast({
            type: 'success',
            message: `Disconnected ${email} successfully.`,
          });
          loadAccounts();
        } catch (err) {
          setError(err.message);
        }
      },
    });
  };

  const mapStatus = (status) => {
    if (status === 'connected') return 'completed';
    if (status === 'error') return 'failed';
    return 'pending'; // revoked
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Outreach Settings"
        title="Email Accounts"
        description="Connect your Gmail accounts through secure Google OAuth2 to send cold email campaigns."
        action={
          <Button icon={Mail01Icon} onClick={handleConnect}>
            Connect Gmail Account
          </Button>
        }
      />

      {toast && (
        <Alert
          type={toast.type}
          dismissible
          onDismiss={() => setToast(null)}
          className="mb-4"
        >
          {toast.message}
        </Alert>
      )}

      {error && (
        <Alert type="error" dismissible onDismiss={() => setError('')} className="mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-hairline bg-surface-soft py-20 text-center">
          <div className="absolute inset-0 dot-pattern opacity-20 pointer-events-none" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-teal/10 animate-float text-brand-teal">
              <Mail01Icon size={24} />
            </div>
            <p className="text-lg font-medium text-ink">No email accounts connected</p>
            <p className="mt-1 text-muted">Connect your Gmail to begin your outreach campaigns.</p>
            <Button icon={Mail01Icon} className="mt-6" onClick={handleConnect}>
              Connect Gmail
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const dailyLimit = parseInt(import.meta.env.VITE_GMAIL_DAILY_SEND_LIMIT || '450', 10);
            const progress = Math.min(((account.dailySendCount || 0) / dailyLimit) * 100, 100);
            
            return (
              <article
                key={account._id}
                className="account-card-anim opacity-0 group flex flex-col overflow-hidden rounded-3xl border border-hairline bg-surface-soft hover:border-brand-teal/30 hover:bg-surface-strong/20 transition-all duration-200"
              >
                <div className="flex flex-1 flex-col p-6">
                  {/* Account Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink truncate text-base leading-snug">{account.email}</h3>
                      <p className="text-xs text-muted mt-1 uppercase tracking-wider font-semibold">Gmail Provider</p>
                    </div>
                    <StatusBadge status={mapStatus(account.status)} />
                  </div>

                  {/* Daily Limits */}
                  {account.status === 'connected' && (
                    <div className="mt-6 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted">Daily Limit Usage</span>
                        <span className="text-ink">{account.dailySendCount || 0} / {dailyLimit} sent</span>
                      </div>
                      
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-strong/40">
                        <div
                          className="h-full rounded-full bg-brand-teal transition-all duration-700 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      
                      {account.dailySendResetAt && (
                        <div className="flex items-center gap-1 text-[11px] text-muted">
                          <Clock01Icon size={12} />
                          <span>Resets at: {new Date(account.dailySendResetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Disconnected Notice */}
                  {account.status !== 'connected' && (
                    <div className="mt-6 py-2 px-3 bg-error/10 border border-error/10 rounded-xl text-xs text-error font-medium">
                      {account.status === 'error' 
                        ? 'Token refresh failed. Reconnect is required.' 
                        : 'Account disconnected. Reconnect to send emails.'}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-hairline pt-4">
                    <button
                      type="button"
                      onClick={() => setSelectedAccount(account)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas hover:bg-surface-strong px-3 py-1.5 text-xs font-semibold text-ink transition-colors cursor-pointer"
                    >
                      <EyeIcon size={14} />
                      Logs
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleDisconnect(account._id, account.email)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-canvas hover:bg-error/10 hover:text-error hover:border-error/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors cursor-pointer ml-auto"
                    >
                      <Delete02Icon size={14} />
                      Disconnect
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

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

      {/* Logs Modal */}
      {selectedAccount && (
        <EmailLogsModal
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  );
}
