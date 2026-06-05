import { NavLink, Outlet } from 'react-router-dom';

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600/20 text-blue-400'
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
  }`;

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/campaigns', label: 'Campaigns', icon: '🎯' },
  { to: '/chat', label: 'AI Chat', icon: '💬' },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-60 flex-col border-r border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-5 py-5">
          <h1 className="text-xl font-bold text-blue-400">LeadAI</h1>
          <p className="mt-0.5 text-xs text-slate-500">Lead Generation Platform</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={navLinkClass}>
              <span>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-slate-800 bg-slate-900/50 px-6">
          <span className="text-sm font-medium text-slate-400">LeadAI Dashboard</span>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
