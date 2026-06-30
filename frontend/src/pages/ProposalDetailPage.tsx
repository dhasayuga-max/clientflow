import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Edit, Trash2, Copy, ArrowLeft, Loader2,
  Presentation, FileText, CheckCircle, XCircle, Send, Clock
} from 'lucide-react';
import { proposalApi } from '../api';
import { ServiceCategory } from '../types';
import { formatDate, getStatusBadgeClass, downloadBlob } from '../utils';

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [downloadingPPTX, setDownloadingPPTX] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => proposalApi.getOne(id!).then(r => r.data.data),
  });

  const handleStatus = async (status: string) => {
    try {
      await proposalApi.updateStatus(id!, status);
      toast.success(`Marked as ${status}`);
      qc.invalidateQueries({ queryKey: ['proposal', id] });
      qc.invalidateQueries({ queryKey: ['proposals'] });
    } catch { toast.error('Failed to update status'); }
  };

  const handleDuplicate = async () => {
    try {
      const res = await proposalApi.duplicate(id!);
      toast.success('Proposal duplicated');
      navigate(`/proposals/${res.data.data._id}`);
    } catch { toast.error('Failed to duplicate'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this proposal? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await proposalApi.delete(id!);
      toast.success('Proposal deleted');
      navigate('/proposals');
    } catch { toast.error('Failed to delete'); setDeleting(false); }
  };

  const handleDownloadPPTX = async () => {
    setDownloadingPPTX(true);
    try {
      const res = await proposalApi.downloadPPTX(id!);
      downloadBlob(res.data, `${proposal?.proposalNumber || 'proposal'}.pptx`);
      toast.success('PPTX downloaded');
    } catch { toast.error('Failed to download PPTX'); }
    finally { setDownloadingPPTX(false); }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const res = await proposalApi.downloadPDF(id!);
      downloadBlob(res.data, `${proposal?.proposalNumber || 'proposal'}.pdf`);
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to download PDF'); }
    finally { setDownloadingPDF(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  if (!proposal) return <div className="text-center text-gray-500 py-16">Proposal not found</div>;

  const services = [...proposal.services].sort((a: ServiceCategory, b: ServiceCategory) => a.order - b.order);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{proposal.proposalNumber}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{proposal.companyName} &middot; {formatDate(proposal.proposalDate)}</p>
          </div>
          <span className={`badge ${getStatusBadgeClass(proposal.status)}`}>{proposal.status}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Download buttons */}
          <button onClick={handleDownloadPPTX} disabled={downloadingPPTX}
            className="btn-secondary text-sm gap-2">
            {downloadingPPTX ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
            Download PPTX
          </button>
          <button onClick={handleDownloadPDF} disabled={downloadingPDF}
            className="btn-secondary text-sm gap-2">
            {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Download PDF
          </button>

          {/* Action menu */}
          <Link to={`/proposals/${id}/editor`} className="btn-secondary text-sm">
            <Edit className="w-4 h-4" /> Edit
          </Link>
          <button onClick={handleDuplicate} className="btn-secondary text-sm">
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger text-sm">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Status actions */}
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500 font-medium">Mark as:</span>
        {(['draft', 'sent', 'accepted', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => handleStatus(s)}
            disabled={proposal.status === s}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed
              ${s === 'accepted' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20' :
                s === 'rejected' ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20' :
                s === 'sent' ? 'border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20' :
                'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}>
            {s === 'accepted' && <CheckCircle className="w-3 h-3 inline mr-1" />}
            {s === 'rejected' && <XCircle className="w-3 h-3 inline mr-1" />}
            {s === 'sent' && <Send className="w-3 h-3 inline mr-1" />}
            {s === 'draft' && <Clock className="w-3 h-3 inline mr-1" />}
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Cover details */}
      <div className="card overflow-hidden">
        <div className="p-5 rounded-t-xl" style={{ background: '#E8762C' }}>
          <h3 className="text-white font-bold text-lg">Social Media Production & Meta Ads Proposal</h3>
          <p className="text-orange-100 text-sm mt-1">for {proposal.companyName}</p>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-gray-500 text-xs uppercase font-medium mb-1">Client</p><p className="font-semibold text-gray-900 dark:text-white">{proposal.clientName}</p></div>
          <div><p className="text-gray-500 text-xs uppercase font-medium mb-1">Company</p><p className="font-semibold text-gray-900 dark:text-white">{proposal.companyName}</p></div>
          <div><p className="text-gray-500 text-xs uppercase font-medium mb-1">Date</p><p className="font-semibold text-gray-900 dark:text-white">{formatDate(proposal.proposalDate)}</p></div>
          <div><p className="text-gray-500 text-xs uppercase font-medium mb-1">Proposal #</p><p className="font-semibold text-gray-900 dark:text-white">{proposal.proposalNumber}</p></div>
        </div>
      </div>

      {/* Video Package */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Monthly Video Package</h3>
        <div className="rounded-xl p-4" style={{ background: '#E8762C' }}>
          <div className="flex justify-between items-center text-white">
            <p className="font-bold text-base">{proposal.videoCount}</p>
            <p className="font-bold text-lg">Rs.{proposal.monthlyPrice.toLocaleString('en-IN')} <span className="font-normal text-sm opacity-75">Monthly</span></p>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Service Categories ({services.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((svc: ServiceCategory, i: number) => (
            <div key={i} className="rounded-lg p-3 border border-orange-100 dark:border-orange-900/30" style={{ background: '#FFF3E8' }}>
              <div className="flex items-start gap-2 mb-2">
                <span className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#E8762C' }}>
                  {i + 1}
                </span>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{svc.name}</p>
              </div>
              <ul className="space-y-1 ml-7">
                {svc.bullets.filter(b => b.trim()).map((b, bi) => (
                  <li key={bi} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                    <span className="mt-1 w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Meta Ads pricing */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Meta Ads Monthly Charges</h3>
        <div className="rounded-xl p-4" style={{ background: '#E8762C' }}>
          <div className="grid grid-cols-3 gap-4 text-white">
            <div><p className="font-bold text-sm">Monthly charges</p></div>
            <div>
              <p className="text-xs opacity-75">Below Rs.{proposal.belowAdSpend.toLocaleString('en-IN')} monthly ad spend</p>
              <p className="font-bold text-base">Rs.{proposal.monthlyCharge.toLocaleString('en-IN')} / month</p>
            </div>
            <div>
              <p className="text-xs opacity-75">Above Rs.{proposal.aboveAdSpend.toLocaleString('en-IN')} monthly ad spend</p>
              <p className="font-bold text-base">{proposal.percentageCharge}% of monthly spend</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed slides note */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Fixed slides in the exported proposal:</p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Slide 5: Production Equipment &nbsp;&middot;&nbsp; Slide 6: Case Studies &nbsp;&middot;&nbsp; Slide 7: Brands &nbsp;&middot;&nbsp; Slide 8: Thank You</p>
      </div>

      {proposal.notes && (
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Internal Notes</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{proposal.notes}</p>
        </div>
      )}
    </div>
  );
}
