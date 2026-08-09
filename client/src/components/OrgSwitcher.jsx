import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function OrgSwitcher() {
  const { organization } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    organization.list().then((res) => {
      if (res.data) setOrgs(res.data);
    }).catch(() => {});

    organization.getActive().then((res) => {
      if (res.data) setActiveOrg(res.data);
    }).catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSwitch = async (org) => {
    await organization.setActive({ organizationId: org.id });
    setActiveOrg(org);
    setOpen(false);
    window.location.reload(); // Reload to refresh all org-scoped data
  };

  if (!activeOrg && orgs.length === 0) return null;

  const initials = (name) => name?.slice(0, 2).toUpperCase() ?? '??';
  const orgColor = (id) => {
    const colors = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626'];
    return colors[(id?.charCodeAt(0) ?? 0) % colors.length];
  };

  return (
    <div className="org-switcher" ref={ref}>
      <button
        id="org-switcher-btn"
        className="org-switcher-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div
          className="org-avatar"
          style={{ background: orgColor(activeOrg?.id) }}
        >
          {initials(activeOrg?.name ?? 'NA')}
        </div>
        <div className="org-info">
          <span className="org-name">{activeOrg?.name ?? 'Select workspace'}</span>
          <span className="org-role">Workspace</span>
        </div>
        <svg
          className={`org-chevron ${open ? 'org-chevron--open' : ''}`}
          width="16" height="16" viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="org-dropdown" role="listbox">
          <div className="org-dropdown-header">Switch workspace</div>
          {orgs.map((org) => (
            <button
              key={org.id}
              id={`org-option-${org.id}`}
              className={`org-option ${activeOrg?.id === org.id ? 'org-option--active' : ''}`}
              onClick={() => handleSwitch(org)}
              role="option"
              aria-selected={activeOrg?.id === org.id}
            >
              <div
                className="org-avatar org-avatar--sm"
                style={{ background: orgColor(org.id) }}
              >
                {initials(org.name)}
              </div>
              <span>{org.name}</span>
              {activeOrg?.id === org.id && (
                <svg className="org-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5L13 5" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
