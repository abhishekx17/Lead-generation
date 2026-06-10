import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight2,
  Chart21,
  People,
  Radar2,
  TrendUp,
  MessageText1,
} from 'iconsax-reactjs';
import { getCampaigns } from '../api';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

const statCards = [
  {
    label: 'Total Campaigns',
    key: 'campaigns',
    icon: Radar2,
    iconBg: 'bg-black/[0.04]',
    iconColor: 'text-ink/80',
  },
  {
    label: 'Total Leads',
    key: 'leads',
    icon: People,
    iconBg: 'bg-black/[0.04]',
    iconColor: 'text-ink/80',
  },
  {
    label: 'Active Campaigns',
    key: 'active',
    icon: TrendUp,
    iconBg: 'bg-black/[0.04]',
    iconColor: 'text-ink/80',
  },
];

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 600;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), value);
      setDisplay(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <>{display}</>;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCampaigns()
      .then(setCampaigns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalLeads = campaigns.reduce((sum, c) => sum + (c.totalLeads || 0), 0);
  const activeCampaigns = campaigns.filter(
    (c) => c.status === 'running' || c.status === 'pending',
  ).length;

  const statValues = {
    campaigns: campaigns.length,
    leads: totalLeads,
    active: activeCampaigns,
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-8 w-72" />
          <div className="skeleton h-3 w-48 mt-3" />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error">{error}</Alert>;
  }

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow={getGreeting()}
        title="Go to market with unique leads"
        description="Track campaigns, monitor scraping progress, and export enriched lead data to Google Sheets."
        action={
          <Link to="/campaigns">
            <Button icon={Radar2}>New Campaign</Button>
          </Link>
        }
      />

      {/* Stat cards — clean white with colored accent */}
      <div className="grid gap-5 sm:grid-cols-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.key}
              className={`animate-fade-in-up delay-${index + 1} group rounded-2xl border border-hairline bg-canvas p-6 shadow-[0_1px_3px_rgba(10,10,10,0.04)] hover-lift`}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-muted">{stat.label}</p>
                <div className={`rounded-xl p-2.5 ${stat.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon size={20} variant="Bold" className={stat.iconColor} />
                </div>
              </div>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-ink">
                <AnimatedNumber value={statValues[stat.key]} />
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent campaigns table */}
      <section className="animate-fade-in-up delay-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="caption-uppercase text-muted">Recent activity</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
              Recent Campaigns
            </h2>
          </div>
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline-offset-4 hover:underline transition-colors"
          >
            View all
            <ArrowRight2 size={16} />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-[0_1px_3px_rgba(10,10,10,0.03)]">
          {campaigns.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-card animate-float">
                <Radar2 size={28} variant="Bold" className="text-muted" />
              </div>
              <p className="text-lg font-medium text-ink">No campaigns yet</p>
              <p className="mt-1 text-sm text-muted">Create your first campaign to start generating leads.</p>
              <Link to="/campaigns" className="mt-5 inline-block">
                <Button variant="secondary" size="sm">
                  Create your first campaign
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto table-row-hover">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-surface-soft/80 text-muted">
                    <th className="px-6 py-3.5 font-semibold">Name</th>
                    <th className="px-6 py-3.5 font-semibold">Location</th>
                    <th className="px-6 py-3.5 font-semibold">Target</th>
                    <th className="px-6 py-3.5 font-semibold">Leads</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 10).map((campaign) => (
                    <tr
                      key={campaign._id}
                      className="border-b border-hairline/60 text-body last:border-0 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-ink">
                        {campaign.name}
                      </td>
                      <td className="px-6 py-4">{campaign.location}</td>
                      <td className="px-6 py-4">{campaign.targetAudience}</td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-ink">{campaign.totalLeads || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to="/campaigns"
                          className="inline-flex items-center gap-1 rounded-lg bg-surface-card px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-strong"
                        >
                          Manage
                          <ArrowRight2 size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* CTA band */}
      <section className="animate-fade-in-up delay-5 overflow-hidden rounded-2xl border border-hairline bg-surface-soft p-10 sm:p-14 shadow-[0_1px_3px_rgba(10,10,10,0.03)]">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary mb-5">
              <MessageText1 size={22} variant="Bold" />
            </div>
            <h2 className="display-md max-w-lg">
              Turn your growth ideas into reality today
            </h2>
            <p className="mt-3 max-w-md text-muted leading-relaxed">
              Ask AI about your leads, filter by location, and discover your best-performing campaigns.
            </p>
          </div>
          <Link to="/chat">
            <Button icon={ArrowRight2} iconPosition="right" size="lg">
              Open AI Chat
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
