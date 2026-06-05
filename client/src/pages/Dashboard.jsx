import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCampaigns } from '../api';
import StatusBadge from '../components/StatusBadge';

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
  const activeCampaigns = campaigns.filter((c) => c.status === 'running' || c.status === 'pending').length;

  const stats = [
    { label: 'Total Campaigns', value: campaigns.length, color: 'text-blue-400' },
    { label: 'Total Leads', value: totalLeads, color: 'text-emerald-400' },
    { label: 'Active Campaigns', value: activeCampaigns, color: 'text-amber-400' },
  ];

  if (loading) {
    return <p className="text-slate-400">Loading dashboard…</p>;
  }

  if (error) {
    return <p className="text-red-400">Error: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400">Overview of your lead generation campaigns</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="font-semibold text-white">Recent Campaigns</h3>
          <Link to="/campaigns" className="text-sm text-blue-400 hover:underline">
            View all
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-400">
            No campaigns yet.{' '}
            <Link to="/campaigns" className="text-blue-400 hover:underline">
              Create your first campaign
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Target</th>
                  <th className="px-5 py-3 font-medium">Leads</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 10).map((campaign) => (
                  <tr key={campaign._id} className="border-b border-slate-800/50 text-slate-300">
                    <td className="px-5 py-3 font-medium text-white">{campaign.name}</td>
                    <td className="px-5 py-3">{campaign.location}</td>
                    <td className="px-5 py-3">{campaign.targetAudience}</td>
                    <td className="px-5 py-3">{campaign.totalLeads || 0}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        to="/campaigns"
                        className="text-blue-400 hover:underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
