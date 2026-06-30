import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, Filter, Download, Mail, MessageCircle, CheckCircle, Clock, Trash2, Eye } from 'lucide-react';
import { invoiceApi } from '../api';
import { Invoice } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClass, downloadBlob } from '../utils';

const STATUS_FILTERS = ['', 'pending', 'paid', 'overdue'];

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, status, page],
    queryFn: () => invoiceApi.getAll({ search, status, page, limit: 15 }).then(r => r.data),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => invoiceApi.markPaid(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Marked as paid'); },
    onError: () => toast.error('Failed to update'),
  });

  const markPending = useMutation({
    mutationFn: (id: string) => invoiceApi.markPending(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Marked as pending'); },
  });

  const deleteInvoice = useMutation({
    mutationFn: (id: string) => invoiceApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const sendEmail = useMutation({
    mutationFn: (id: string) => invoiceApi.sendEmail(id),
    onSuccess: () => toast.success('Email sent!'),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to send email');
    },
  });

  const sendWA = useMutation({
    mutationFn: (id: string) => invoiceApi.sendWhatsApp(id),
    onSuccess: () => toast.success('WhatsApp sent!'),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to send WhatsApp');
    },
  });

  const handleDownload = async (inv: Invoice) => {
    try {
      const res = await invoiceApi.downloadPDF(inv._id);
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), `${inv.invoiceNumber}.pdf`);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const invoices: Invoice[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invoices</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{pagination?.total || 0} total invoices</p>
        </div>
        <Link to="/invoices/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Create Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by client, invoice number..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select className="input w-36" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            {STATUS_FILTERS.map(s => (
              <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Invoice #', 'Client', 'Amount', 'Due Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-12 text-sm">
                    No invoices found. <Link to="/invoices/new" className="text-primary-600 hover:underline">Create your first one</Link>
                  </td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/invoices/${inv._id}`} className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.clientName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{inv.companyName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-sm text-gray-900 dark:text-white">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={getStatusBadgeClass(inv.status)}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/invoices/${inv._id}`} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDownload(inv)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => sendEmail.mutate(inv._id)} disabled={sendEmail.isPending} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Send Email">
                          <Mail className="w-4 h-4" />
                        </button>
                        <button onClick={() => sendWA.mutate(inv._id)} disabled={sendWA.isPending} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Send WhatsApp">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        {inv.status !== 'paid' ? (
                          <button onClick={() => markPaid.mutate(inv._id)} disabled={markPaid.isPending} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Mark as Paid">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => markPending.mutate(inv._id)} disabled={markPending.isPending} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Mark as Pending">
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm('Delete this invoice?')) deleteInvoice.mutate(inv._id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-secondary py-1 px-3 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages} className="btn-secondary py-1 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
