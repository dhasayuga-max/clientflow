import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, Download, Mail, MessageCircle, Copy, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { proposalApi } from '../api';
import { formatCurrency, formatDate, getStatusBadgeClass, downloadBlob } from '../utils';

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => proposalApi.getOne(id!).then(r => r.data.data),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => proposalApi.updateStatus(id!, status),
    onSuccess: (_, status) => { qc.invalidateQueries({ queryKey: ['proposal', id] }); toast.success(`Marked as ${status}`); },
  });

  const duplicate = useMutation({
    mutationFn: () => proposalApi.duplicate(id!),
    onSuccess: (res) => {
      toast.success('Proposal duplicated!');
      navigate(`/proposals/${res.data.data._id}`);
    },
  });

  const deleteP = useMutation({
    mutationFn: () => proposalApi.delete(id!),
    onSuccess: () => { toast.success('Proposal deleted'); navigate('/proposals'); },
  });

  const sendEmail = useMutation({
    mutationFn: () => proposalApi.sendEmail(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposal', id] }); toast.success('Email sent!'); },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to send email');
    },
  });

  const sendWA = useMutation({
    mutationFn: () => proposalApi.sendWhatsApp(id!),
    onSuccess: () => toast.success('WhatsApp sent!'),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to send WhatsApp');
    },
  });

  const handleDownload = async () => {
    try {
      const res = await proposalApi.downloadPDF(id!);
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), `${proposal?.proposalNumber}.pdf`);
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const proposal = data;
  if (!proposal) return <div className="text-center text-gray-500 py-12">Proposal not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{proposal.proposalNumber}</h2>
              <span className={getStatusBadgeClass(proposal.status)}>{proposal.status}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(proposal.proposalDate)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/proposals/${id}/edit`} className="btn-secondary text-xs"><Edit className="w-3.5 h-3.5" /> Edit</Link>
          <button onClick={handleDownload} className="btn-secondary text-xs"><Download className="w-3.5 h-3.5" /> PDF</button>
          <button onClick={() => sendEmail.mutate()} disabled={sendEmail.isPending} className="btn-secondary text-xs"><Mail className="w-3.5 h-3.5" /> Email</button>
          <button onClick={() => sendWA.mutate()} disabled={sendWA.isPending} className="btn-secondary text-xs"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</button>
          <button onClick={() => duplicate.mutate()} disabled={duplicate.isPending} className="btn-secondary text-xs"><Copy className="w-3.5 h-3.5" /> Duplicate</button>
          {proposal.status !== 'accepted' && <button onClick={() => updateStatus.mutate('accepted')} className="btn-primary text-xs"><CheckCircle className="w-3.5 h-3.5" /> Accept</button>}
          {proposal.status !== 'rejected' && <button onClick={() => updateStatus.mutate('rejected')} className="btn-danger text-xs"><XCircle className="w-3.5 h-3.5" /> Reject</button>}
          <button onClick={() => { if (confirm('Delete this proposal?')) deleteP.mutate(); }} className="btn-danger text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Proposal card */}
      <div className="card overflow-hidden">
        {/* Header band */}
        <div className="bg-primary-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">BUSINESS PROPOSAL</h1>
              <p className="text-primary-200 text-sm mt-1">#{proposal.proposalNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-primary-200">Proposal Date</p>
              <p className="font-semibold">{formatDate(proposal.proposalDate)}</p>
              {proposal.validUntil && <>
                <p className="text-primary-200 mt-1">Valid Until</p>
                <p className="font-semibold">{formatDate(proposal.validUntil)}</p>
              </>}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Prepared For</p>
              <p className="font-bold text-gray-900 dark:text-white text-lg">{proposal.clientName}</p>
              <p className="text-gray-600 dark:text-gray-400">{proposal.companyName}</p>
              <p className="text-gray-500 text-sm mt-1 whitespace-pre-line">{proposal.address}</p>
              <p className="text-gray-500 text-sm">{proposal.email}</p>
              <p className="text-gray-500 text-sm">{proposal.phone}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status History</p>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusBadgeClass(proposal.status)}`}>
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Services & Pricing</h3>
            <div className="space-y-3">
              {proposal.services.map((s: { name: string; description?: string; price: number }, i: number) => (
                <div key={i} className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{s.name}</p>
                    {s.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{s.description}</p>}
                  </div>
                  <p className="font-bold text-primary-600 dark:text-primary-400 ml-4 text-lg flex-shrink-0">{formatCurrency(s.price)}</p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-end mt-4">
              <div className="bg-primary-600 text-white rounded-xl px-6 py-4 text-right">
                <p className="text-xs text-primary-200">Total Investment</p>
                <p className="text-2xl font-bold">{formatCurrency(proposal.totalAmount)}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {proposal.notes && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes / Terms</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{proposal.notes}</p>
            </div>
          )}

          {/* Signature area */}
          <div className="grid grid-cols-2 gap-8 pt-4">
            {['Client Signature & Date', 'Authorized Signature & Date'].map(label => (
              <div key={label}>
                <div className="border-b-2 border-gray-300 dark:border-gray-600 mb-2 h-12" />
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
