const styles = {
  pending: 'bg-slate-700 text-slate-300',
  running: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
  completed: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
  failed: 'bg-red-500/20 text-red-400 border border-red-500/40',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] || styles.pending}`}
    >
      {status === 'running' && (
        <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
      )}
      {status}
    </span>
  );
}
