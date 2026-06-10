import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Chart21,
  HamburgerMenu,
  MessageText1,
  Radar2,
  CloseCircle,
  Flash,
  Sun,
  Moon,
} from 'iconsax-reactjs';

const links = [
  { to: '/', label: 'Dashboard', icon: Chart21, end: true },
  { to: '/campaigns', label: 'Campaigns', icon: Radar2 },
  { to: '/chat', label: 'AI Chat', icon: MessageText1 },
];

const pageTitles = {
  '/': 'Dashboard',
  '/campaigns': 'Campaigns',
  '/chat': 'AI Chat',
};

function NavItems({ onNavigate }) {
  return links.map((link) => {
    const Icon = link.icon;
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        onClick={onNavigate}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
            isActive
              ? 'bg-surface-card text-ink shadow-[0_1px_3px_rgba(10,10,10,0.04)]'
              : 'text-muted hover:bg-surface-card/60 hover:text-ink'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && <span className="nav-active-indicator" />}
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              isActive ? 'bg-brand-teal text-on-dark' : 'bg-surface-strong/60 text-muted group-hover:bg-surface-strong group-hover:text-ink'
            }`}>
              <Icon size={18} variant="Bold" />
            </div>
            {link.label}
          </>
        )}
      </NavLink>
    );
  });
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    // Check local storage or system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const { pathname } = useLocation();
  const pageTitle = pageTitles[pathname] || 'LeadAI';

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
    <div className="flex min-h-screen bg-canvas text-body">
      {/* Desktop sidebar */}
      <aside className="hidden w-[272px] shrink-0 flex-col border-r border-hairline bg-surface-soft lg:flex">
        {/* Logo area with decorative gradient */}
        <div className="relative border-b border-hairline px-6 py-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-lavender/8 via-transparent to-brand-peach/8 pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal text-on-dark shadow-[0_2px_8px_-2px_rgba(26,58,58,0.4)]">
              <Radar2 size={22} variant="Bold" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-ink">LeadAI</h1>
              <p className="text-[11px] font-medium text-muted">Lead Generation</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          <p className="caption-uppercase mb-2 px-3 text-muted-soft">Menu</p>
          <NavItems />
        </nav>

        {/* Bottom card */}
        <div className="border-t border-hairline p-4">
          <div className="rounded-xl bg-gradient-to-br from-brand-teal to-surface-dark p-4 text-on-dark">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 mb-3">
              <Flash size={16} variant="Bold" />
            </div>
            <p className="text-xs font-semibold leading-snug">AI Lead Scraping</p>
            <p className="mt-1 text-[11px] text-white/60 leading-relaxed">
              Find prospects, enrich data & export to Google Sheets
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="modal-backdrop absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="animate-slide-in-left relative flex h-full w-72 flex-col bg-surface-soft shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal text-on-dark">
                  <Radar2 size={20} variant="Bold" />
                </div>
                <span className="text-lg font-semibold text-ink">LeadAI</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-surface-card hover:text-ink transition-colors"
              >
                <CloseCircle size={22} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </nav>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-hairline bg-canvas/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-xl p-2 text-ink transition-colors hover:bg-surface-card lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <HamburgerMenu size={22} variant="Bold" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal text-on-dark">
                <Radar2 size={16} variant="Bold" />
              </div>
              <span className="text-sm font-semibold text-ink">LeadAI</span>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="text-sm font-medium text-muted">{pageTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-surface-soft text-ink hover:bg-surface-card transition-all duration-300 focus:outline-none overflow-hidden active:scale-95"
              aria-label="Toggle theme"
            >
              <div className="relative h-6 w-6 transition-transform duration-500 ease-out" style={{ transform: isDark ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <span className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
                  isDark ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100 rotate-0'
                }`}>
                  <Sun size={20} variant="Bold" className="text-amber-500" />
                </span>
                <span className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
                  isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90'
                }`}>
                  <Moon size={20} variant="Bold" className="text-blue-400" />
                </span>
              </div>
            </button>

            <span className="hidden rounded-full bg-surface-card px-3.5 py-1.5 text-xs font-medium text-muted sm:inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              GTM Workspace
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="page-enter mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="relative border-t border-hairline bg-surface-soft px-6 py-10 overflow-hidden">
          {/* Decorative gradient wave */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-lavender/5 via-brand-peach/5 to-brand-ochre/5 pointer-events-none" />
          <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-ochre/40 to-brand-peach/40">
                <Radar2 size={18} variant="Bold" className="text-ink" />
              </div>
              <div>
                <span className="text-sm font-semibold text-ink">LeadAI</span>
                <span className="ml-2 text-xs text-muted">·</span>
                <span className="ml-2 text-xs text-muted">Lead Generation Platform</span>
              </div>
            </div>
            <p className="text-sm text-muted">
              Turn your growth ideas into reality — one campaign at a time.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
