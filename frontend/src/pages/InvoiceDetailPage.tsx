import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, Download, Mail, MessageCircle, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { invoiceApi } from '../api';
import { formatCurrency, formatDate, getStatusBadgeClass, downloadBlob } from '../utils';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceApi.getOne(id!).then(r => r.data.data),
  });

  const markPaid = useMutation({
    mutationFn: () => invoiceApi.markPaid(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); toast.success('Marked as paid'); },
  });

  const markPending = useMutation({
    mutationFn: () => invoiceApi.markPending(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); toast.success('Marked as pending'); },
  });

  const sendEmail = useMutation({
    mutationFn: () => invoiceApi.sendEmail(id!),
    onSuccess: () => toast.success('Email sent successfully!'),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to send email');
    },
  });

  const sendWA = useMutation({
    mutationFn: () => invoiceApi.sendWhatsApp(id!),
    onSuccess: () => toast.success('WhatsApp message sent!'),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to send WhatsApp');
    },
  });

  const deleteInv = useMutation({
    mutationFn: () => invoiceApi.delete(id!),
    onSuccess: () => { toast.success('Invoice deleted'); navigate('/invoices'); },
  });

  const handleDownload = async () => {
    try {
      const res = await invoiceApi.downloadPDF(id!);
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), `${invoice?.invoiceNumber}.pdf`);
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );

  const invoice = data;
  if (!invoice) return <div className="text-center text-gray-500 py-12">Invoice not found</div>;

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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{invoice.invoiceNumber}</h2>
              <span className={getStatusBadgeClass(invoice.status)}>{invoice.status}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Created {formatDate(invoice.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/invoices/${id}/edit`} className="btn-secondary text-xs">
            <Edit className="w-3.5 h-3.5" /> Edit
          </Link>
          <button onClick={handleDownload} className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={() => sendEmail.mutate()} disabled={sendEmail.isPending} className="btn-secondary text-xs">
            <Mail className="w-3.5 h-3.5" /> Email
          </button>
          <button onClick={() => sendWA.mutate()} disabled={sendWA.isPending} className="btn-secondary text-xs">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
          {invoice.status !== 'paid' ? (
            <button onClick={() => markPaid.mutate()} disabled={markPaid.isPending} className="btn-primary text-xs">
              <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
            </button>
          ) : (
            <button onClick={() => markPending.mutate()} disabled={markPending.isPending} className="btn-secondary text-xs">
              <Clock className="w-3.5 h-3.5" /> Mark Pending
            </button>
          )}
          <button
            onClick={() => { if (confirm('Delete this invoice?')) deleteInv.mutate(); }}
            className="btn-danger text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Invoice preview card */}
      <div className="card overflow-hidden">
        {/* Invoice header */}
        <div className="bg-primary-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">INVOICE</h1>
              <p className="text-primary-200 mt-1 text-sm">#{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-primary-200 text-xs">Invoice Date</p>
              <p className="font-semibold">{formatDate(invoice.invoiceDate)}</p>
              <p className="text-primary-200 text-xs mt-1">Due Date</p>
              <p className="font-semibold">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
              <p className="font-bold text-gray-900 dark:text-white text-lg">{invoice.clientName}</p>
              <p className="text-gray-600 dark:text-gray-400">{invoice.companyName}</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1 whitespace-pre-line">{invoice.address}</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">{invoice.email}</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">{invoice.whatsappNumber}</p>
            </div>
            {invoice.reminderCount > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Reminder Info</p>
                <p className="text-sm text-amber-600 dark:text-amber-300">{invoice.reminderCount} reminder{invoice.reminderCount > 1 ? 's' : ''} sent</p>
                {invoice.lastReminderSent && (
                  <p className="text-xs text-amber-500 mt-1">Last: {formatDate(invoice.lastReminderSent)}</p>
                )}
              </div>
            )}
          </div>

          {/* Services table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Service</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Description</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Qty</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Price</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {invoice.services.map((s: { serviceName: string; serviceDescription?: string; quantity: number; price: number; total: number }, i: number) => (
                  <tr key={i}>
                    <td className="px-3 py-3 font-medium text-sm text-gray-900 dark:text-white">{s.serviceName}</td>
                    <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">{s.serviceDescription || '—'}</td>
                    <td className="px-3 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{s.quantity}</td>
                    <td className="px-3 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{formatCurrency(s.price)}</td>
                    <td className="px-3 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Tax ({invoice.taxRate}%)</span><span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
                <span>Total</span>
                <span className="text-primary-600 text-lg">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              {invoice.status === 'paid' && invoice.paidAt && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 text-right">Paid on {formatDate(invoice.paidAt)}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
