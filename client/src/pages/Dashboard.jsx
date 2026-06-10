import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight01Icon,
  DashboardCircleIcon,
  UserGroupIcon,
  Radar01Icon,
  ChartIncreaseIcon,
  BubbleChatIcon,
} from 'hugeicons-react';
import { getCampaigns } from '../api';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { gsap } from 'gsap';

const statCards = [
  {
    label: 'Total Campaigns',
    key: 'campaigns',
    icon: Radar01Icon,
    iconBg: 'bg-brand-peach/10',
    iconColor: 'text-brand-peach',
  },
  {
    label: 'Total Leads',
    key: 'leads',
    icon: UserGroupIcon,
    iconBg: 'bg-brand-lavender/15',
    iconColor: 'text-brand-lavender',
  },
  {
    label: 'Active Campaigns',
    key: 'active',
    icon: ChartIncreaseIcon,
    iconBg: 'bg-brand-teal/10',
    iconColor: 'text-brand-teal',
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

function useGreeting() {
  const compute = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) return 'Burning the midnight oil';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const [greeting, setGreeting] = useState(compute);
  useEffect(() => {
    // re-evaluate on the minute boundary
    const tick = () => setGreeting(compute());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return greeting;
}

const motivationQuotes = [
  'Go to market with unique leads.',
  'Consistency builds campaigns that convert.',
  'Small wins compound into big growth.',
  'Reach the right lead, not every lead.',
  'Sharp targeting beats noisy outreach.',
  'One good lead can change the week.',
  'Clarity turns effort into pipeline.',
  'Momentum starts with a single action.',
  'Better leads make better outcomes.',
  'Sell to the right person faster.',
  'Precision beats volume every time.',
  'Keep refining until the message clicks.',
  'Today’s outreach can fund tomorrow’s growth.',
  'The next lead might be your best one.',
  'Focus creates cleaner conversions.',
  'Lead quality compounds like interest.',
  'Strong signals deserve fast follow-up.',
  'Make every touchpoint count.',
  'Growth is built in consistent reps.',
  'A focused list beats a noisy crowd.',
  'Find intent, then move quickly.',
  'Every campaign teaches the next one.',
  'Good targeting saves great teams time.',
  'Progress loves a repeatable process.',
  'The sharper the list, the stronger the reply.',
  'Catch demand while it is still warm.',
  'Keep the pipeline moving forward.',
  'The best growth is intentional growth.',
  'Move with confidence and clean data.',
  'Shorten the path from lead to close.',
  'Your next insight may come from one call.',
  'Build demand around real need.',
  'Simple outreach often works best.',
  'Good systems create steady wins.',
  'Stay close to the signal.',
  'Better targeting reduces wasted motion.',
  'Win with relevance, not noise.',
  'Consistency makes opportunity visible.',
  'Every qualified lead is leverage.',
  'Grow the list, then grow the business.',
  'Strong positioning attracts better responses.',
  'Narrow the audience, sharpen the message.',
  'Build trust before you build scale.',
  'The right timing changes everything.',
  'Lead with value and follow with speed.',
  'Small improvements create large returns.',
  'Focus on buyers who already need you.',
  'Refined outreach leads to refined results.',
  'Make the market recognize your value.',
  'A clean pipeline is a powerful thing.',
  'Target well and the market responds.',
];

function useRotatingQuote() {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * motivationQuotes.length));
  const [previousQuoteIndex, setPreviousQuoteIndex] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentQuoteIndexRef = useRef(quoteIndex);
  const blurTimerRef = useRef(null);

  useEffect(() => {
    currentQuoteIndexRef.current = quoteIndex;
  }, [quoteIndex]);

  useEffect(() => {
    const id = setInterval(() => {
      const currentIndex = currentQuoteIndexRef.current;
      setPreviousQuoteIndex(currentIndex);
      setIsTransitioning(true);
      setQuoteIndex((current) => {
        let next = current;
        while (next === current) {
          next = Math.floor(Math.random() * motivationQuotes.length);
        }
        return next;
      });

      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        setPreviousQuoteIndex(null);
        setIsTransitioning(false);
      }, 700);
    }, 10000);

    return () => {
      clearInterval(id);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  return {
    currentQuote: motivationQuotes[quoteIndex],
    previousQuote: previousQuoteIndex === null ? null : motivationQuotes[previousQuoteIndex],
    isTransitioning,
  };
}

export default function Dashboard() {
  const greeting = useGreeting();
  const { currentQuote, previousQuote, isTransitioning } = useRotatingQuote();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCampaigns()
      .then(setCampaigns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // GSAP animation for stat cards and page elements
  useEffect(() => {
    if (!loading && !error) {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(
          '.stat-card-anim',
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
        );
        gsap.fromTo(
          '.recent-activity-anim',
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, delay: 0.2, ease: 'power2.out' }
        );
      }
    }
  }, [loading, error]);

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
      <div className="space-y-12">
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
        eyebrow={greeting}
        title="Go to market with unique leads"
        action={
          <Link to="/campaigns">
            <Button icon={Radar01Icon}>New Campaign</Button>
          </Link>
        }
      />
      <div className="rounded-2xl border border-hairline bg-surface-soft px-5 py-4">
        <p className="caption-uppercase text-[11px] font-semibold tracking-wider text-muted">Daily motivation</p>
        <div className="relative mt-2 min-h-8 overflow-hidden">
          {previousQuote && (
            <p
              className={`absolute inset-0 text-sm md:text-base font-medium text-body leading-relaxed ${
                isTransitioning ? 'quote-blur-out' : 'opacity-0'
              }`}
            >
              {previousQuote}
            </p>
          )}
          <p
            className={`text-sm md:text-base font-medium text-ink leading-relaxed ${
              isTransitioning ? 'quote-blur-in' : 'quote-clear'
            }`}
          >
            {currentQuote}
          </p>
        </div>
      </div>

      {/* Stat cards — solid surface background, no shadow, hairline border */}
      <div className="grid gap-5 sm:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.key}
              className="stat-card-anim opacity-0 rounded-2xl border border-hairline bg-surface-soft p-6 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="caption-uppercase text-[11px] tracking-wider text-muted font-semibold">{stat.label}</span>
                <div className={`rounded-xl p-2 ${stat.iconBg}`}>
                  <Icon size={18} className={stat.iconColor} />
                </div>
              </div>
              <p className="mt-3 text-[32px] font-medium tracking-tight text-ink leading-none">
                <AnimatedNumber value={statValues[stat.key]} />
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent campaigns table */}
      <section className="recent-activity-anim opacity-0 space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="caption-uppercase text-xs font-semibold tracking-wider text-muted">Recent activity</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              Recent Campaigns
            </h2>
          </div>
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline-offset-4 hover:underline transition-colors"
          >
            View all
            <ArrowRight01Icon size={16} />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-hairline bg-canvas">
          {campaigns.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-soft animate-float">
                <Radar01Icon size={24} className="text-muted" />
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-surface-soft text-muted">
                    <th className="px-6 py-4 caption-uppercase text-[11px] font-semibold tracking-wider">Name</th>
                    <th className="px-6 py-4 caption-uppercase text-[11px] font-semibold tracking-wider">Location</th>
                    <th className="px-6 py-4 caption-uppercase text-[11px] font-semibold tracking-wider">Target</th>
                    <th className="px-6 py-4 caption-uppercase text-[11px] font-semibold tracking-wider">Leads</th>
                    <th className="px-6 py-4 caption-uppercase text-[11px] font-semibold tracking-wider">Status</th>
                    <th className="px-6 py-4 caption-uppercase text-[11px] font-semibold tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 5).map((campaign) => (
                    <tr
                      key={campaign._id}
                      className="border-b border-hairline/60 text-body last:border-0 hover:bg-surface-soft/40 transition-colors"
                    >
                      <td className="px-6 py-4.5 font-semibold text-ink">
                        {campaign.name}
                      </td>
                      <td className="px-6 py-4.5">{campaign.location}</td>
                      <td className="px-6 py-4.5">{campaign.targetAudience}</td>
                      <td className="px-6 py-4.5">
                        <span className="font-semibold text-ink">{campaign.totalLeads || 0}</span>
                      </td>
                      <td className="px-6 py-4.5">
                        <StatusBadge status={campaign.status} surface="default" />
                      </td>
                      <td className="px-6 py-4.5">
                        <Link
                          to="/campaigns"
                          className="inline-flex items-center gap-1 rounded-lg bg-surface-soft border border-hairline px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-strong"
                        >
                          Manage
                          <ArrowRight01Icon size={14} />
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
      <section className="recent-activity-anim opacity-0 overflow-hidden rounded-3xl border border-hairline bg-surface-soft p-10 sm:p-14">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-teal text-white mb-5">
              <BubbleChatIcon size={20} />
            </div>
            <h2 className="text-2xl md:text-3xl font-medium text-ink tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              Turn your growth ideas into reality today
            </h2>
            <p className="mt-2.5 max-w-lg text-sm md:text-base text-muted leading-relaxed">
              Ask AI about your leads, filter by location, and discover your best-performing campaigns.
            </p>
          </div>
          <Link to="/chat" className="shrink-0">
            <Button icon={ArrowRight01Icon} iconPosition="right" size="lg">
              Open AI Chat
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
