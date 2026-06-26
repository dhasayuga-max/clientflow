import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2, ArrowLeft, X } from 'lucide-react';
import { proposalApi } from '../api';
import { ServiceCategory } from '../types';

interface ProposalFormData {
  clientName: string;
  companyName: string;
  videoCount: string;
  monthlyPrice: number;
  belowAdSpend: number;
  monthlyCharge: number;
  aboveAdSpend: number;
  percentageCharge: number;
  services: ServiceCategory[];
  notes: string;
}

const DEFAULT_SERVICES: ServiceCategory[] = [
  { name: 'Initial Consultation', bullets: ['Understand client goals', 'Review existing marketing efforts'], order: 0 },
  { name: 'Ad Creation & Optimization', bullets: ['Ad copy & creative optimization', 'Landing page optimization', 'Ad formats'], order: 1 },
  { name: 'Campaign Structure & Strategy', bullets: ['Campaign objectives', 'Ad sets & targeting', 'Budget & scheduling'], order: 2 },
  { name: 'Account Setup & Optimization', bullets: ['Meta Business Account setup', 'Ad account configuration'], order: 3 },
  { name: 'Tracking & Analytics', bullets: ['Pixel & conversion tracking', 'Link Meta Ads and Analytics', 'Monitor key metrics'], order: 4 },
  { name: 'Campaign Management', bullets: ['Budget management & bidding', 'Ad placement & optimization', 'Ongoing management & optimization', 'Reporting & analysis', 'Client communication'], order: 5 },
];

export default function CreateProposalPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ProposalFormData>({
    clientName: '',
    companyName: 'Shanthi Ayurvedas',
    videoCount: '12 Videos / Month',
    monthlyPrice: 57000,
    belowAdSpend: 30000,
    monthlyCharge: 10000,
    aboveAdSpend: 30000,
    percentageCharge: 20,
    services: DEFAULT_SERVICES,
    notes: '',
  });

  const { data: existingProposal } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => proposalApi.getOne(id!).then(r => r.data.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingProposal) {
      setForm({
        clientName: existingProposal.clientName,
        companyName: existingProposal.companyName,
        videoCount: existingProposal.videoCount,
        monthlyPrice: existingProposal.monthlyPrice,
        belowAdSpend: existingProposal.belowAdSpend,
        monthlyCharge: existingProposal.monthlyCharge,
        aboveAdSpend: existingProposal.aboveAdSpend,
        percentageCharge: existingProposal.percentageCharge,
        services: [...existingProposal.services].sort((a: ServiceCategory, b: ServiceCategory) => a.order - b.order),
        notes: existingProposal.notes || '',
      });
    }
  }, [existingProposal]);

  // --- Service category helpers ---
  const addCategory = () => {
    setForm(f => ({
      ...f,
      services: [...f.services, { name: '', bullets: [''], order: f.services.length }],
    }));
  };

  const removeCategory = (i: number) => {
    setForm(f => ({
      ...f,
      services: f.services.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx })),
    }));
  };

  const updateCategoryName = (i: number, name: string) => {
    setForm(f => {
      const svcs = [...f.services];
      svcs[i] = { ...svcs[i], name };
      return { ...f, services: svcs };
    });
  };

  const addBullet = (catIdx: number) => {
    setForm(f => {
      const svcs = [...f.services];
      svcs[catIdx] = { ...svcs[catIdx], bullets: [...svcs[catIdx].bullets, ''] };
      return { ...f, services: svcs };
    });
  };

  const updateBullet = (catIdx: number, bIdx: number, val: string) => {
    setForm(f => {
      const svcs = [...f.services];
      const bullets = [...svcs[catIdx].bullets];
      bullets[bIdx] = val;
      svcs[catIdx] = { ...svcs[catIdx], bullets };
      return { ...f, services: svcs };
    });
  };

  const removeBullet = (catIdx: number, bIdx: number) => {
    setForm(f => {
      const svcs = [...f.services];
      const bullets = svcs[catIdx].bullets.filter((_, i) => i !== bIdx);
      svcs[catIdx] = { ...svcs[catIdx], bullets: bullets.length > 0 ? bullets : [''] };
      return { ...f, services: svcs };
    });
  };

  const moveCategory = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= form.services.length) return;
    setForm(f => {
      const svcs = [...f.services];
      [svcs[i], svcs[j]] = [svcs[j], svcs[i]];
      return { ...f, services: svcs.map((s, idx) => ({ ...s, order: idx })) };
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim()) { toast.error('Client name is required'); return; }
    if (!form.companyName.trim()) { toast.error('Company name is required'); return; }
    if (form.services.length === 0) { toast.error('At least one service category is required'); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        services: form.services.map((s, i) => ({ ...s, order: i, bullets: s.bullets.filter(b => b.trim()) })),
        monthlyPrice: Number(form.monthlyPrice),
        belowAdSpend: Number(form.belowAdSpend),
        monthlyCharge: Number(form.monthlyCharge),
        aboveAdSpend: Number(form.aboveAdSpend),
        percentageCharge: Number(form.percentageCharge),
      };

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

  const fld = `w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {isEdit ? 'Edit Proposal' : 'Create Proposal'}
        </h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">

        {/* Client Info */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Client Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Client Name *</label>
              <input className={fld} value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="e.g. Rajesh Kumar" />
            </div>
            <div>
              <label className="label">Company / Business Name *</label>
              <input className={fld} value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="e.g. Shanthi Ayurvedas" />
            </div>
          </div>
        </div>

        {/* Video Package */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Monthly Video Package</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Appears on Slide 3</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Video Count Label</label>
              <input className={fld} value={form.videoCount} onChange={e => setForm(f => ({ ...f, videoCount: e.target.value }))} placeholder="12 Videos / Month" />
            </div>
            <div>
              <label className="label">Monthly Price (Rs.)</label>
              <input type="number" className={fld} value={form.monthlyPrice} onChange={e => setForm(f => ({ ...f, monthlyPrice: Number(e.target.value) }))} />
            </div>
          </div>
        </div>

        {/* Meta Ads Pricing */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Meta Ads Pricing</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Appears on the charges banner at the bottom of Slide 4</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Below Ad Spend (Rs.)</label>
              <input type="number" className={fld} value={form.belowAdSpend} onChange={e => setForm(f => ({ ...f, belowAdSpend: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Monthly Charge (Rs.)</label>
              <input type="number" className={fld} value={form.monthlyCharge} onChange={e => setForm(f => ({ ...f, monthlyCharge: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Above Ad Spend (Rs.)</label>
              <input type="number" className={fld} value={form.aboveAdSpend} onChange={e => setForm(f => ({ ...f, aboveAdSpend: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Percentage Charge (%)</label>
              <input type="number" className={fld} value={form.percentageCharge} onChange={e => setForm(f => ({ ...f, percentageCharge: Number(e.target.value) }))} />
            </div>
          </div>

          {/* Live preview of the charges banner */}
          <div className="mt-4 rounded-xl p-4" style={{ background: '#E8762C' }}>
            <div className="grid grid-cols-3 gap-4 text-white text-sm">
              <div><p className="font-semibold text-sm">Monthly charges</p></div>
              <div>
                <p className="text-xs opacity-75">Below Rs.{form.belowAdSpend.toLocaleString('en-IN')} monthly ad spend</p>
                <p className="font-bold text-base">Rs.{form.monthlyCharge.toLocaleString('en-IN')} / month</p>
              </div>
              <div>
                <p className="text-xs opacity-75">Above Rs.{form.aboveAdSpend.toLocaleString('en-IN')} monthly ad spend</p>
                <p className="font-bold text-base">{form.percentageCharge}% of monthly spend</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Services */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">Service Categories</h3>
            <button type="button" onClick={addCategory} className="btn-primary text-xs py-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Category
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Appears as cards on Slide 4 — auto-adjusts layout as categories grow</p>

          <div className="space-y-4">
            {form.services.map((svc, catIdx) => (
              <div key={catIdx} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => moveCategory(catIdx, -1)} disabled={catIdx === 0}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20 transition-colors text-xs leading-none">▲</button>
                    <button type="button" onClick={() => moveCategory(catIdx, 1)} disabled={catIdx === form.services.length - 1}
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20 transition-colors text-xs leading-none">▼</button>
                  </div>
                  <div className="flex-1">
                    <input
                      className={fld}
                      placeholder="Category name (e.g. Initial Consultation)"
                      value={svc.name}
                      onChange={e => updateCategoryName(catIdx, e.target.value)}
                    />
                  </div>
                  <span className="text-xs text-gray-400 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full font-medium">
                    #{catIdx + 1}
                  </span>
                  <button type="button" onClick={() => removeCategory(catIdx)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bullet points */}
                <div className="space-y-2 ml-8">
                  {svc.bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      <input
                        className={fld}
                        placeholder="Bullet point"
                        value={bullet}
                        onChange={e => updateBullet(catIdx, bIdx, e.target.value)}
                      />
                      <button type="button" onClick={() => removeBullet(catIdx, bIdx)}
                        disabled={svc.bullets.length <= 1}
                        className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-20 transition-colors flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addBullet(catIdx)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 ml-3.5">
                    <Plus className="w-3 h-3" /> Add bullet
                  </button>
                </div>
              </div>
            ))}

            {form.services.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                No categories yet. Click "Add Category" above to start.
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Internal Notes (Optional)</h3>
          <textarea className={fld} rows={2}
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Internal notes — not shown in the proposal" />
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
