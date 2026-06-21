import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { proposalApi, clientApi } from '../api';
import { Client } from '../types';
import { formatCurrency } from '../utils';

interface ProposalServiceRow {
  name: string;
  description: string;
  price: number;
}

interface ProposalFormData {
  clientName: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  services: ProposalServiceRow[];
  proposalDate: string;
  validUntil: string;
  notes: string;
}

export default function CreateProposalPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [total, setTotal] = useState(0);

  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientApi.getAll({ limit: 100 }).then(r => r.data.data as Client[]),
  });

  const { data: existingProposal } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => proposalApi.getOne(id!).then(r => r.data.data),
    enabled: isEdit,
  });

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<ProposalFormData>({
    defaultValues: {
      services: [{ name: '', description: '', price: 0 }],
      proposalDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'services' });
  const watchedServices = watch('services');

  useEffect(() => {
    const t = watchedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    setTotal(t);
  }, [watchedServices]);

  useEffect(() => {
    if (existingProposal) {
      reset({
        clientName: existingProposal.clientName,
        companyName: existingProposal.companyName,
        address: existingProposal.address,
        phone: existingProposal.phone,
        email: existingProposal.email,
        services: existingProposal.services.map((s: ProposalServiceRow) => ({ name: s.name, description: s.description || '', price: s.price })),
        proposalDate: existingProposal.proposalDate?.split('T')[0],
        validUntil: existingProposal.validUntil?.split('T')[0] || '',
        notes: existingProposal.notes || '',
      });
    }
  }, [existingProposal, reset]);

  const handleClientSelect = (clientId: string) => {
    const client = clientsData?.find(c => c._id === clientId);
    if (client) {
      setValue('clientName', client.name);
      setValue('companyName', client.companyName);
      setValue('email', client.email);
      setValue('phone', client.whatsappNumber);
      setValue('address', client.address);
    }
  };

  const onSubmit = async (data: ProposalFormData) => {
    setIsSubmitting(true);
    try {
      const payload = { ...data, services: data.services.map(s => ({ ...s, price: Number(s.price) })) };
      if (isEdit) {
        await proposalApi.update(id!, payload);
        toast.success('Proposal updated!');
        navigate(`/proposals/${id}`);
      } else {
        const res = await proposalApi.create(payload);
        toast.success('Proposal created!');
        navigate(`/proposals/${res.data.data._id}`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to save proposal');
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Proposal' : 'Create Proposal'}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Client quick-fill */}
        {!isEdit && clientsData && clientsData.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Fill from Existing Client</h3>
            <select className="input" onChange={e => handleClientSelect(e.target.value)}>
              <option value="">— Select a client to auto-fill —</option>
              {clientsData.map(c => <option key={c._id} value={c._id}>{c.name} ({c.companyName})</option>)}
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
              <label className="label">Phone / WhatsApp *</label>
              <input className="input" {...register('phone', { required: 'Required' })} placeholder="+91 9999999999" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address *</label>
              <textarea className="input" rows={2} {...register('address', { required: 'Required' })} placeholder="123 Main St, City, State - PIN" />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>
          </div>
        </div>

        {/* Proposal details */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Proposal Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Proposal Date</label>
              <input type="date" className="input" {...register('proposalDate')} />
            </div>
            <div>
              <label className="label">Valid Until</label>
              <input type="date" className="input" {...register('validUntil')} />
            </div>
          </div>
        </div>

        {/* Services & Pricing */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Services & Pricing</h3>
            <button type="button" onClick={() => append({ name: '', description: '', price: 0 })} className="btn-secondary text-xs py-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Service
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="col-span-12 sm:col-span-4">
                  <label className="label text-xs">Service Name *</label>
                  <input className="input" placeholder="e.g. SEO Package" {...register(`services.${index}.name`, { required: true })} />
                </div>
                <div className="col-span-12 sm:col-span-5">
                  <label className="label text-xs">Description</label>
                  <input className="input" placeholder="Brief description of the service" {...register(`services.${index}.description`)} />
                </div>
                <div className="col-span-10 sm:col-span-2">
                  <label className="label text-xs">Price (₹) *</label>
                  <input type="number" min="0" step="0.01" className="input" placeholder="0" {...register(`services.${index}.price`, { required: true, min: 0 })} />
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-end pb-1">
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 flex justify-end">
            <div className="bg-primary-600 text-white rounded-xl px-6 py-3 text-right">
              <p className="text-xs text-primary-200">Total Investment</p>
              <p className="text-2xl font-bold">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Notes / Terms (Optional)</h3>
          <textarea className="input" rows={3} {...register('notes')} placeholder="Payment terms, project timeline, or any special conditions..." />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Create Proposal'}
          </button>
        </div>
      </form>
    </div>
  );
}
