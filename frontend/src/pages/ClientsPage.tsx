import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Plus, Edit, Trash2, Eye, Phone, Mail, Building2, X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { clientApi } from '../api';
import { Client } from '../types';

interface ClientFormData {
  name: string;
  companyName: string;
  email: string;
  whatsappNumber: string;
  phone: string;
  address: string;
  state: string;
  gstNumber: string;
  notes: string;
}

function ClientModal({ client, onClose, onSave }: { client?: Client | null; onClose: () => void; onSave: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ClientFormData>({
    defaultValues: client ? {
      name: client.name, companyName: client.companyName, email: client.email,
      whatsappNumber: client.whatsappNumber, phone: client.phone || '',
      address: client.address, state: client.state || '', gstNumber: client.gstNumber || '', notes: client.notes || '',
    } : {},
  });

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      if (client) {
        await clientApi.update(client._id, data);
        toast.success('Client updated!');
      } else {
        await clientApi.create(data);
        toast.success('Client added!');
      }
      onSave();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">{client ? 'Edit Client' : 'Add Client'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input" {...register('name', { required: 'Required' })} placeholder="John Doe" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Company *</label>
              <input className="input" {...register('companyName', { required: 'Required' })} placeholder="Acme Corp" />
              {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" {...register('email', { required: 'Required' })} placeholder="client@company.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">WhatsApp *</label>
              <input className="input" {...register('whatsappNumber', { required: 'Required' })} placeholder="+91 9999999999" />
              {errors.whatsappNumber && <p className="text-red-500 text-xs mt-1">{errors.whatsappNumber.message}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" {...register('phone')} placeholder="+91 9999999999" />
            </div>
          </div>
          <div>
            <label className="label">Address *</label>
            <textarea className="input" rows={2} {...register('address', { required: 'Required' })} placeholder="Full address..." />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">State</label>
              <input className="input" {...register('state')} placeholder="Tamil Nadu" />
            </div>
            <div>
              <label className="label">GST Number</label>
              <input className="input" {...register('gstNumber')} placeholder="22AAAAA0000A1Z5" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} {...register('notes')} placeholder="Any additional notes..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : client ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, page],
    queryFn: () => clientApi.getAll({ search, page, limit: 15 }).then(r => r.data),
  });

  const deleteClient = useMutation({
    mutationFn: (id: string) => clientApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client deleted'); },
  });

  const clients: Client[] = data?.data || [];
  const pagination = data?.pagination;

  const openEdit = (client: Client) => { setEditClient(client); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditClient(null); };
  const handleSave = () => { qc.invalidateQueries({ queryKey: ['clients'] }); closeModal(); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Clients</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{pagination?.total || 0} total clients</p>
        </div>
        <button onClick={() => { setEditClient(null); setModalOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search clients by name, company, email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No clients yet</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary mt-4">Add Your First Client</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => (
            <div key={client._id} className="card p-5 hover:border-primary-200 dark:hover:border-primary-800 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 dark:text-primary-400 font-bold">{client.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{client.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{client.companyName}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(client)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (confirm('Delete client?')) deleteClient.mutate(client._id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span>{client.whatsappNumber}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/clients/${client._id}`} className="btn-secondary text-xs flex-1 justify-center py-1.5">
                  <Eye className="w-3.5 h-3.5" /> View History
                </Link>
                <Link to={`/invoices/new`} state={{ clientId: client._id }} className="btn-primary text-xs flex-1 justify-center py-1.5">
                  Invoice
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-secondary py-1 px-3 disabled:opacity-40">Prev</button>
          <span className="flex items-center text-sm text-gray-500 px-2">{page} / {pagination.pages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages} className="btn-secondary py-1 px-3 disabled:opacity-40">Next</button>
        </div>
      )}

      {modalOpen && <ClientModal client={editClient} onClose={closeModal} onSave={handleSave} />}
    </div>
  );
}
