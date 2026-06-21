import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { invoiceApi, clientApi } from '../api';
import { Client } from '../types';
import { formatCurrency } from '../utils';

interface ServiceRow {
  serviceName: string;
  serviceDescription: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceFormData {
  clientId: string;
  clientName: string;
  companyName: string;
  email: string;
  whatsappNumber: string;
  address: string;
  invoiceDate: string;
  dueDate: string;
  services: ServiceRow[];
  taxRate: number;
  notes: string;
}

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientApi.getAll({ limit: 100 }).then(r => r.data.data as Client[]),
  });

  const { data: existingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceApi.getOne(id!).then(r => r.data.data),
    enabled: isEdit,
  });

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<InvoiceFormData>({
    defaultValues: {
      services: [{ serviceName: '', serviceDescription: '', quantity: 1, price: 0, total: 0 }],
      taxRate: 0,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'services' });
  const watchedServices = watch('services');
  const watchedTaxRate = watch('taxRate');

  // Populate form when editing
  useEffect(() => {
    if (existingInvoice) {
      reset({
        clientName: existingInvoice.clientName,
        companyName: existingInvoice.companyName,
        email: existingInvoice.email,
        whatsappNumber: existingInvoice.whatsappNumber,
        address: existingInvoice.address,
        invoiceDate: existingInvoice.invoiceDate?.split('T')[0],
        dueDate: existingInvoice.dueDate?.split('T')[0],
        services: existingInvoice.services.map((s: ServiceRow) => ({
          serviceName: s.serviceName,
          serviceDescription: s.serviceDescription || '',
          quantity: s.quantity,
          price: s.price,
          total: s.total,
        })),
        taxRate: existingInvoice.taxRate || 0,
        notes: existingInvoice.notes || '',
      });
    }
  }, [existingInvoice, reset]);

  // Recalculate totals
  useEffect(() => {
    const sub = watchedServices.reduce((sum, s) => sum + (Number(s.quantity) * Number(s.price)), 0);
    const tax = (sub * Number(watchedTaxRate)) / 100;
    setSubtotal(sub);
    setTaxAmount(tax);
    setTotalAmount(sub + tax);
    // Update each row's total
    watchedServices.forEach((s, i) => {
      const rowTotal = Number(s.quantity) * Number(s.price);
      if (s.total !== rowTotal) setValue(`services.${i}.total`, rowTotal);
    });
  }, [watchedServices, watchedTaxRate, setValue]);

  // Auto-fill client info
  const handleClientSelect = (clientId: string) => {
    const client = clientsData?.find(c => c._id === clientId);
    if (client) {
      setValue('clientName', client.name);
      setValue('companyName', client.companyName);
      setValue('email', client.email);
      setValue('whatsappNumber', client.whatsappNumber);
      setValue('address', client.address);
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        services: data.services.map(s => ({ ...s, total: Number(s.quantity) * Number(s.price) })),
        taxRate: Number(data.taxRate),
      };

      if (isEdit) {
        await invoiceApi.update(id!, payload);
        toast.success('Invoice updated!');
        navigate(`/invoices/${id}`);
      } else {
        const res = await invoiceApi.create(payload);
        toast.success('Invoice created!');
        navigate(`/invoices/${res.data.data._id}`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to save invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Client selection */}
        {!isEdit && clientsData && clientsData.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Fill from Existing Client</h3>
            <select className="input" onChange={e => handleClientSelect(e.target.value)}>
              <option value="">— Select a client to auto-fill —</option>
              {clientsData.map(c => (
                <option key={c._id} value={c._id}>{c.name} ({c.companyName})</option>
              ))}
            </select>
          </div>
        )}

        {/* Client details */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Client Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Client Name *</label>
              <input className="input" {...register('clientName', { required: 'Required' })} placeholder="John Doe" />
              {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName.message}</p>}
            </div>
            <div>
              <label className="label">Company Name *</label>
              <input className="input" {...register('companyName', { required: 'Required' })} placeholder="Acme Corp" />
              {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" {...register('email', { required: 'Required' })} placeholder="client@company.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">WhatsApp Number *</label>
              <input className="input" {...register('whatsappNumber', { required: 'Required' })} placeholder="+91 9999999999" />
              {errors.whatsappNumber && <p className="text-red-500 text-xs mt-1">{errors.whatsappNumber.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address *</label>
              <textarea className="input" rows={2} {...register('address', { required: 'Required' })} placeholder="123 Main St, City, State - PIN" />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>
          </div>
        </div>

        {/* Invoice details */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Invoice Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Invoice Date *</label>
              <input type="date" className="input" {...register('invoiceDate', { required: 'Required' })} />
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input type="date" className="input" {...register('dueDate', { required: 'Required' })} />
            </div>
            <div>
              <label className="label">Tax Rate (%)</label>
              <input type="number" className="input" min="0" max="100" step="0.5" {...register('taxRate')} placeholder="0" />
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Services</h3>
            <button type="button" onClick={() => append({ serviceName: '', serviceDescription: '', quantity: 1, price: 0, total: 0 })} className="btn-secondary text-xs py-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 sm:col-span-3">
                  {index === 0 && <label className="label text-xs">Service Name *</label>}
                  <input className="input" placeholder="Service name" {...register(`services.${index}.serviceName`, { required: true })} />
                </div>
                <div className="col-span-12 sm:col-span-3">
                  {index === 0 && <label className="label text-xs">Description</label>}
                  <input className="input" placeholder="Description" {...register(`services.${index}.serviceDescription`)} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  {index === 0 && <label className="label text-xs">Qty *</label>}
                  <input type="number" min="1" className="input" {...register(`services.${index}.quantity`, { required: true, min: 1 })} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  {index === 0 && <label className="label text-xs">Price (₹) *</label>}
                  <input type="number" min="0" step="0.01" className="input" {...register(`services.${index}.price`, { required: true, min: 0 })} />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  {index === 0 && <label className="label text-xs">Total</label>}
                  <div className="input bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white cursor-not-allowed">
                    {formatCurrency((Number(watchedServices[index]?.quantity) || 0) * (Number(watchedServices[index]?.price) || 0))}
                  </div>
                </div>
                <div className={`col-span-1 flex items-${index === 0 ? 'end pb-1' : 'start pt-0.5'}`}>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-72 space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {Number(watchedTaxRate) > 0 && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Tax ({watchedTaxRate}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Notes (Optional)</h3>
          <textarea className="input" rows={3} {...register('notes')} placeholder="Payment terms, bank details, or any special instructions..." />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
