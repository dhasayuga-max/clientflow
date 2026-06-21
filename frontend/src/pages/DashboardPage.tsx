import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, FileText, FileCheck, Users, Clock, CheckCircle, Plus
} from 'lucide-react';
import { dashboardApi } from '../api';
import { formatCurrency, formatDate, getStatusBadgeClass, getMonthName } from '../utils';
import { DashboardStats } from '../types';

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(r => r.data.data as DashboardStats),
  });

  const chartData = (data?.monthlyRevenue || []).map(m => ({
    name: getMonthName(m._id.month),
    revenue: m.revenue,
    invoices: m.count,
  }));

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/invoices/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
        <Link to="/proposals/new" className="btn-secondary">
          <Plus className="w-4 h-4" /> New Proposal
        </Link>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatCurrency(data?.revenue.total || 0)} icon={TrendingUp} color="bg-primary-600" />
        <StatCard label="Pending Revenue" value={formatCurrency(data?.revenue.pending || 0)} sub="Awaiting payment" icon={Clock} color="bg-amber-500" />
        <StatCard label="Total Clients" value={data?.clients.total || 0} icon={Users} color="bg-blue-500" />
        <StatCard label="Accepted Proposals" value={data?.proposals.accepted || 0} sub={`of ${data?.proposals.total || 0} total`} icon={CheckCircle} color="bg-emerald-500" />
      </div>

      {/* Invoice stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: data?.invoices.total || 0, cls: 'text-gray-900 dark:text-white' },
          { label: 'Paid', value: data?.invoices.paid || 0, cls: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Pending', value: data?.invoices.pending || 0, cls: 'text-amber-600 dark:text-amber-400' },
          { label: 'Overdue', value: data?.invoices.overdue || 0, cls: 'text-red-600 dark:text-red-400' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart + Proposal Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue (Last 6 Months)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
              No revenue data yet. Create your first paid invoice!
            </div>
          )}
        </div>

        {/* Proposal stats */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Proposals</h3>
          <div className="space-y-3">
            {[
              { label: 'Total', value: data?.proposals.total || 0, color: 'bg-gray-200 dark:bg-gray-700' },
              { label: 'Sent', value: data?.proposals.sent || 0, color: 'bg-blue-500' },
              { label: 'Accepted', value: data?.proposals.accepted || 0, color: 'bg-emerald-500' },
              { label: 'Rejected', value: data?.proposals.rejected || 0, color: 'bg-red-500' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{s.label}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">{s.value}</span>
              </div>
            ))}
          </div>
          <Link to="/proposals" className="btn-secondary w-full justify-center mt-4 text-xs">
            View All Proposals
          </Link>
        </div>
      </div>

      {/* Recent invoices & proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent invoices */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-600" /> Recent Invoices
            </h3>
            <Link to="/invoices" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {(data?.recentInvoices || []).length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No invoices yet</p>
            ) : (
              data?.recentInvoices.map(inv => (
                <Link key={inv._id} to={`/invoices/${inv._id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{inv.clientName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{inv.invoiceNumber} · {formatDate(inv.invoiceDate)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className={getStatusBadgeClass(inv.status)}>{inv.status}</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(inv.totalAmount)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent proposals */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-primary-600" /> Recent Proposals
            </h3>
            <Link to="/proposals" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {(data?.recentProposals || []).length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No proposals yet</p>
            ) : (
              data?.recentProposals.map(prop => (
                <Link key={prop._id} to={`/proposals/${prop._id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{prop.clientName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{prop.proposalNumber} · {formatDate(prop.proposalDate)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className={getStatusBadgeClass(prop.status)}>{prop.status}</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(prop.totalAmount)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
