import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, Download, Mail, MessageCircle, Copy, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';
import { proposalApi } from '../api';
import { Proposal } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClass, downloadBlob } from '../utils';

const STATUS_FILTERS = ['', 'draft', 'sent', 'accepted', 'rejected'];

export default function ProposalsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['proposals', search, status, page],
    queryFn: () => proposalApi.getAll({ search, status, page, limit: 15 }).then(r => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => proposalApi.updateStatus(id, status),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['proposals'] }); toast.success(`Proposal marked as ${vars.status}`); },
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => proposalApi.duplicate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposals'] }); toast.success('Proposal duplicated!'); },
  });

  const deleteProposal = useMutation({
    mutationFn: (id: string) => proposalApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposals'] }); toast.success('Proposal deleted'); },
  });

  const sendEmail = useMutation({
    mutationFn: (id: string) => proposalApi.sendEmail(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposals'] }); toast.success('Email sent!'); },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to send email');
    },
  });

  const sendWA = useMutation({
    mutationFn: (id: string) => proposalApi.sendWhatsApp(id),
    onSuccess: () => toast.success('WhatsApp sent!'),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to send WhatsApp');
    },
  });

  const handleDownload = async (prop: Proposal) => {
    try {
      const res = await proposalApi.downloadPDF(prop._id);
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), `${prop.proposalNumber}.pdf`);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const proposals: Proposal[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Proposals</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{pagination?.total || 0} total proposals</p>
        </div>
        <Link to="/proposals/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Create Proposal
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Draft', status: 'draft', cls: 'text-gray-600 dark:text-gray-400' },
          { label: 'Sent', status: 'sent', cls: 'text-blue-600 dark:text-blue-400' },
          { label: 'Accepted', status: 'accepted', cls: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Rejected', status: 'rejected', cls: 'text-red-600 dark:text-red-400' },
        ].map(s => (
          <button key={s.status} onClick={() => { setStatus(status === s.status ? '' : s.status); setPage(1); }}
            className={`card p-3 text-center cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-all ${status === s.status ? 'ring-2 ring-primary-500' : ''}`}>
            <p className={`text-xl font-bold ${s.cls}`}>{proposals.filter(p => p.status === s.status).length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search proposals..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-36" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          {STATUS_FILTERS.map(s => (
            <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Proposal #', 'Client', 'Amount', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-20" /></td>)}</tr>
                ))
              ) : proposals.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-12 text-sm">
                  No proposals found. <Link to="/proposals/new" className="text-primary-600 hover:underline">Create one</Link>
                </td></tr>
              ) : (
                proposals.map(prop => (
                  <tr key={prop._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/proposals/${prop._id}`} className="text-primary-600 hover:text-primary-700 font-medium text-sm">{prop.proposalNumber}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{prop.clientName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{prop.companyName}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(prop.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(prop.proposalDate)}</td>
                    <td className="px-4 py-3"><span className={getStatusBadgeClass(prop.status)}>{prop.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/proposals/${prop._id}`} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors" title="View"><Eye className="w-4 h-4" /></Link>
                        <button onClick={() => handleDownload(prop)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Download"><Download className="w-4 h-4" /></button>
                        <button onClick={() => sendEmail.mutate(prop._id)} disabled={sendEmail.isPending} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Email"><Mail className="w-4 h-4" /></button>
                        <button onClick={() => sendWA.mutate(prop._id)} disabled={sendWA.isPending} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="WhatsApp"><MessageCircle className="w-4 h-4" /></button>
                        <button onClick={() => updateStatus.mutate({ id: prop._id, status: 'accepted' })} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Accept"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => updateStatus.mutate({ id: prop._id, status: 'rejected' })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Reject"><XCircle className="w-4 h-4" /></button>
                        <button onClick={() => duplicate.mutate(prop._id)} disabled={duplicate.isPending} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Duplicate"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm('Delete this proposal?')) deleteProposal.mutate(prop._id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {pagination.pages}</p>
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
