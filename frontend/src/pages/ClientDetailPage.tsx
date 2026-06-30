import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, FileCheck, Mail, Phone, MapPin, Building2 } from 'lucide-react';
import { clientApi } from '../api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['client-history', id],
    queryFn: () => clientApi.getHistory(id!).then(r => r.data.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const { client, invoices, proposals, stats } = data || {};

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{client?.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{client?.companyName}</p>
        </div>
      </div>

      {/* Client info + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary-600" /> Client Info
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300 break-all">{client?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300">{client?.whatsappNumber}</p>
            </div>
            {client?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-300">{client.phone}</p>
              </div>
            )}
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300">{client?.address}</p>
            </div>
            {client?.gstNumber && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">GST:</span> {client.gstNumber}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-5">
            <Link to={`/invoices/new`} className="btn-primary text-xs flex-1 justify-center py-1.5">New Invoice</Link>
            <Link to={`/proposals/new`} className="btn-secondary text-xs flex-1 justify-center py-1.5">New Proposal</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue || 0), color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Pending Revenue', value: formatCurrency(stats?.pendingRevenue || 0), color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Total Invoices', value: stats?.totalInvoices || 0, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Proposals', value: stats?.totalProposals || 0, color: 'text-purple-600 dark:text-purple-400' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-600" /> Invoices ({invoices?.length || 0})
          </h3>
        </div>
        {!invoices?.length ? (
          <p className="text-center text-gray-400 text-sm py-8">No invoices for this client</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {invoices.map((inv: { _id: string; invoiceNumber: string; invoiceDate: string; totalAmount: number; status: string }) => (
              <Link key={inv._id} to={`/invoices/${inv._id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div>
                  <p className="font-medium text-sm text-primary-600">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(inv.invoiceDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={getStatusBadgeClass(inv.status)}>{inv.status}</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(inv.totalAmount)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Proposals */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-primary-600" /> Proposals ({proposals?.length || 0})
          </h3>
        </div>
        {!proposals?.length ? (
          <p className="text-center text-gray-400 text-sm py-8">No proposals for this client</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {proposals.map((prop: { _id: string; proposalNumber: string; proposalDate: string; totalAmount: number; status: string }) => (
              <Link key={prop._id} to={`/proposals/${prop._id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div>
                  <p className="font-medium text-sm text-primary-600">{prop.proposalNumber}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(prop.proposalDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={getStatusBadgeClass(prop.status)}>{prop.status}</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(prop.totalAmount)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
