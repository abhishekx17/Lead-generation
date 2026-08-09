import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardCircleIcon,
  Menu01Icon,
  BubbleChatIcon,
  Radar01Icon,
  Cancel01Icon,
  Sun01Icon,
  Moon01Icon,
  Mail01Icon,
} from 'hugeicons-react';
import { Menu } from 'lucide-react';
import { gsap } from 'gsap';
import OrgSwitcher from './OrgSwitcher';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../lib/auth-client';

const coreLinks = [
  { to: '/', label: 'Dashboard', icon: DashboardCircleIcon, end: true },
  { to: '/campaigns', label: 'Campaigns', icon: Radar01Icon },
  { to: '/chat', label: 'AI Chat', icon: BubbleChatIcon },
  { to: '/email-accounts', label: 'Email Accounts', icon: Mail01Icon },
];

const pageTitles = {
  '/': 'Dashboard',
  '/campaigns': 'Campaigns',
  '/chat': 'AI Chat',
  '/admin': 'Admin',
  '/email-accounts': 'Email Accounts',
};

function NavItems({ collapsed = false, onNavigate, isSuperAdmin }) {
  const links = isSuperAdmin
    ? [...coreLinks, { to: '/admin', label: 'Admin', icon: DashboardCircleIcon }]
    : coreLinks;
  return links.map((link) => {
    const Icon = link.icon;
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        onClick={onNavigate}
        title={collapsed ? link.label : undefined}
        className={({ isActive }) =>
          `sidebar-nav-item group relative flex items-center gap-3 py-2.5 text-sm font-medium transition-all duration-200 border-l-2 ${
            collapsed ? 'justify-center px-0' : 'px-3'
          } ${
            isActive
              ? 'bg-surface-soft text-ink border-brand-teal'
              : 'text-muted border-transparent hover:bg-surface-soft/50 hover:text-ink'
          }`
        }
        style={{ borderRadius: '0 12px 12px 0' }}
      >
        {({ isActive }) => (
          <>
            <Icon
              size={20}
              className={`shrink-0 transition-colors ${isActive ? 'text-brand-teal' : 'text-muted group-hover:text-ink'}`}
            />
            {!collapsed && <span className="truncate">{link.label}</span>}
            {/* Tooltip when collapsed */}
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-hairline-strong bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {link.label}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  });
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || 'LeadAI';

  // Mount animation for sidebar nav items
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(
        '.sidebar-nav-item',
        { x: -8, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out' }
      );
    }
  }, []);

  // Page transition on route change
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(
        '.page-content-wrapper',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [location.pathname]);

  // Dark mode sync
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-body">

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside
        className="hidden lg:flex h-screen sticky top-0 shrink-0 flex-col border-r border-hairline bg-canvas overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarOpen ? '240px' : '64px' }}
      >
        {/* Logo row — h-16 matches header */}
        <div className="flex h-16 shrink-0 items-center border-b border-hairline px-3 gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-on-dark">
            <Radar01Icon size={20} />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-ink leading-none">LeadAI</h1>
              <p className="text-[10px] font-medium text-muted uppercase tracking-wider mt-0.5">Lead Gen</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex flex-1 flex-col gap-1 overflow-y-auto py-4 ${sidebarOpen ? 'pr-4' : 'pr-0'}`}>
          {sidebarOpen && (
            <p className="caption-uppercase mb-2 px-6 text-muted-soft">Menu</p>
          )}
          <NavItems collapsed={!sidebarOpen} isSuperAdmin={isSuperAdmin} />
        </nav>

        {/* Org switcher in sidebar bottom */}
        {sidebarOpen && (
          <div className="border-t border-hairline px-3 py-3">
            <OrgSwitcher />
          </div>
        )}
      </aside>

      {/* ── Mobile drawer ────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-canvas border-r border-hairline-strong">
            <div className="flex h-16 items-center justify-between border-b border-hairline px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal text-on-dark">
                  <Radar01Icon size={20} />
                </div>
                <span className="text-base font-semibold text-ink">LeadAI</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-surface-soft hover:text-ink transition-colors"
              >
                <Cancel01Icon size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 py-4 pr-4">
              <NavItems onNavigate={() => setMobileOpen(false)} isSuperAdmin={isSuperAdmin} />
            </nav>
            <div className="border-t border-hairline px-4 py-3">
              <OrgSwitcher />
            </div>
          </aside>
        </div>
      )}

      {/* ── Right column: header + body ──────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header — h-16 matches sidebar logo row */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-hairline bg-canvas px-4 sm:px-6 z-40">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              type="button"
              className="rounded-xl p-2 text-ink transition-colors hover:bg-surface-soft lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu01Icon size={20} />
            </button>

            {/* Desktop sidebar toggle — lucide PanelLeft icons */}
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="hidden lg:flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-surface-soft hover:text-ink transition-all duration-200 focus:outline-none active:scale-95 cursor-pointer"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <Menu size={18} />
            </button>

            {/* Mobile logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal text-on-dark">
                <Radar01Icon size={16} />
              </div>
              <span className="text-sm font-semibold text-ink">LeadAI</span>
            </div>

            {/* Desktop breadcrumb */}
            <span className="hidden lg:block text-sm font-medium text-muted">{pageTitle}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-hairline bg-canvas text-ink hover:bg-surface-soft transition-all duration-200 focus:outline-none active:scale-95 cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDark
                ? <Moon01Icon size={18} className="text-brand-lavender" />
                : <Sun01Icon size={18} className="text-brand-ochre" />
              }
            </button>

            {/* User avatar + sign out */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-brand-teal flex items-center justify-center text-xs font-semibold text-white">
                  {user.name?.slice(0, 2).toUpperCase() ?? user.email?.slice(0, 2).toUpperCase()}
                </div>
                <button
                  id="header-signout-btn"
                  type="button"
                  onClick={async () => { await signOut(); navigate('/login'); }}
                  className="text-xs text-muted hover:text-ink transition-colors cursor-pointer"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto">
          <div className="page-content-wrapper mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="shrink-0 border-t border-hairline px-6 py-3">
          <p className="text-xs text-muted text-center">
            © {new Date().getFullYear()} LeadAI
          </p>
        </footer>
      </div>
    </div>
  );
}
