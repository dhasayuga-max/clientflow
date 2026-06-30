import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, Loader2, Presentation, FileText, Edit, Trash2, Copy } from 'lucide-react';
import { proposalApi } from '../api';
import { Proposal } from '../types';
import { formatDate, getStatusBadgeClass, downloadBlob } from '../utils';

const STATUS_FILTERS = ['all', 'draft', 'sent', 'accepted', 'rejected'];

export default function ProposalsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['proposals', search, statusFilter],
    queryFn: () => proposalApi.getAll({
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }).then(r => r.data),
  });

  const proposals: Proposal[] = data?.data || [];

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Delete this proposal?')) return;
    try {
      await proposalApi.delete(id);
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['proposals'] });
    } catch { toast.error('Failed to delete'); }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await proposalApi.duplicate(id);
      toast.success('Duplicated');
      qc.invalidateQueries({ queryKey: ['proposals'] });
      navigate(`/proposals/${res.data.data._id}`);
    } catch { toast.error('Failed to duplicate'); }
  };

  const handleDownload = async (id: string, type: 'pptx' | 'pdf', num: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDownloadingId(`${id}-${type}`);
    try {
      if (type === 'pptx') {
        const res = await proposalApi.downloadPPTX(id);
        downloadBlob(res.data, `${num}.pptx`);
      } else {
        const res = await proposalApi.downloadPDF(id);
        downloadBlob(res.data, `${num}.pdf`);
      }
      toast.success(`${type.toUpperCase()} downloaded`);
    } catch { toast.error(`Failed to download ${type.toUpperCase()}`); }
    finally { setDownloadingId(null); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Proposals</h2>
          <p className="text-sm text-gray-500 mt-0.5">Propelbees-branded proposal generator</p>
        </div>
        <Link to="/proposals/new/editor" className="btn-primary">
          <Plus className="w-4 h-4" /> New Proposal
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search proposals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      ) : proposals.length === 0 ? (
        <div className="card p-16 text-center">
          <Presentation className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No proposals yet</p>
          <Link to="/proposals/new/editor" className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" /> Create First Proposal
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map(p => (
            <Link key={p._id} to={`/proposals/${p._id}`}
              className="card p-4 flex items-center gap-4 hover:shadow-md transition-all group block">
              {/* Orange accent */}
              <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: '#E8762C' }} />

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.companyName}</p>
                  <span className={`badge ${getStatusBadgeClass(p.status)} text-xs`}>{p.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{p.proposalNumber} &middot; {p.clientName} &middot; {formatDate(p.proposalDate)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.services.length} service {p.services.length === 1 ? 'category' : 'categories'} &middot; {p.videoCount}</p>
              </div>

              {/* Pricing summary */}
              <div className="hidden sm:block text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Rs.{p.monthlyPrice.toLocaleString('en-IN')}<span className="text-xs font-normal text-gray-400">/mo</span></p>
                <p className="text-xs text-gray-400">{p.percentageCharge}% above Rs.{p.aboveAdSpend.toLocaleString('en-IN')}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => e.preventDefault()}>
                <button onClick={e => handleDownload(p._id, 'pptx', p.proposalNumber, e)}
                  disabled={downloadingId === `${p._id}-pptx`}
                  title="Download PPTX"
                  className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                  {downloadingId === `${p._id}-pptx` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                </button>
                <button onClick={e => handleDownload(p._id, 'pdf', p.proposalNumber, e)}
                  disabled={downloadingId === `${p._id}-pdf`}
                  title="Download PDF"
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  {downloadingId === `${p._id}-pdf` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                </button>
                <Link to={`/proposals/${p._id}/editor`}
                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </Link>
                <button onClick={e => handleDuplicate(p._id, e)}
                  title="Duplicate"
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={e => handleDelete(p._id, e)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
