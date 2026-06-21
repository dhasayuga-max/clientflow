import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Building2, Mail, MessageCircle, Save, Loader2, Upload, Eye, EyeOff } from 'lucide-react';
import { settingsApi } from '../api';
import { resolveFileUrl } from '../utils';

type Tab = 'company' | 'email' | 'whatsapp';

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('company');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: settingsData, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data.data),
  });

  const companyForm = useForm({ defaultValues: { name: '', address: '', state: '', gstNumber: '', phone: '', website: '', email: '' } });
  const emailForm = useForm({ defaultValues: { smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', fromName: '', secure: false } });
  const whatsappForm = useForm({ defaultValues: { apiUrl: '', apiKey: '', senderNumber: '' } });

  useEffect(() => {
    if (settingsData) {
      if (settingsData.company) companyForm.reset(settingsData.company);
      if (settingsData.email) emailForm.reset({ ...settingsData.email, smtpPass: '' });
      if (settingsData.whatsapp) whatsappForm.reset(settingsData.whatsapp);
      if (settingsData.company?.logo) setLogoPreview(resolveFileUrl(settingsData.company.logo));
    }
  }, [settingsData]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const saveSection = async (section: Tab, data: object) => {
    setIsSaving(true);
    try {
      // Upload logo first if changed
      if (section === 'company' && logoFile) {
        const logoRes = await settingsApi.uploadLogo(logoFile);
        (data as Record<string, unknown>).logo = logoRes.data.data.logoUrl;
        setLogoFile(null);
      }
      await settingsApi.update(section, data);
      toast.success('Settings saved!');
      refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Configure your agency details, email & messaging integrations</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <TabButton active={activeTab === 'company'} onClick={() => setActiveTab('company')}>
          <Building2 className="w-4 h-4" /> Company
        </TabButton>
        <TabButton active={activeTab === 'email'} onClick={() => setActiveTab('email')}>
          <Mail className="w-4 h-4" /> Email SMTP
        </TabButton>
        <TabButton active={activeTab === 'whatsapp'} onClick={() => setActiveTab('whatsapp')}>
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </TabButton>
      </div>

      {/* Company Settings */}
      {activeTab === 'company' && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-5">Company Information</h3>
          <form onSubmit={companyForm.handleSubmit(data => saveSection('company', data))} className="space-y-4">
            {/* Logo */}
            <div>
              <label className="label">Company Logo</label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-16 w-16 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-1" />
                ) : (
                  <div className="h-16 w-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                  </div>
                )}
                <label className="btn-secondary cursor-pointer">
                  <Upload className="w-4 h-4" /> Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
                <p className="text-xs text-gray-400">PNG, JPG, SVG up to 5MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Company Name *</label>
                <input className="input" {...companyForm.register('name', { required: true })} placeholder="Your Agency Name" />
              </div>
              <div>
                <label className="label">GST Number</label>
                <input className="input" {...companyForm.register('gstNumber')} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" {...companyForm.register('phone')} placeholder="+91 9999999999" />
              </div>
              <div>
                <label className="label">Website</label>
                <input className="input" {...companyForm.register('website')} placeholder="https://youragency.com" />
              </div>
              <div>
                <label className="label">Business Email</label>
                <input type="email" className="input" {...companyForm.register('email')} placeholder="hello@youragency.com" />
              </div>
              <div>
                <label className="label">State</label>
                <input className="input" {...companyForm.register('state')} placeholder="Tamil Nadu" />
              </div>
            </div>
            <div>
              <label className="label">Address</label>
              <textarea className="input" rows={3} {...companyForm.register('address')} placeholder="Full business address..." />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Company Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Email Settings */}
      {activeTab === 'email' && (
        <div className="card p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-gray-900 dark:text-white">Email (SMTP) Settings</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure SMTP to send invoices and proposals via email</p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-5">
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">💡 Gmail users:</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Use smtp.gmail.com, port 587, and an App Password (not your regular password). Enable 2FA and generate an App Password in your Google account settings.</p>
          </div>

          <form onSubmit={emailForm.handleSubmit(data => saveSection('email', data))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">SMTP Host</label>
                <input className="input" {...emailForm.register('smtpHost')} placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="label">SMTP Port</label>
                <input type="number" className="input" {...emailForm.register('smtpPort')} placeholder="587" />
              </div>
              <div>
                <label className="label">Email / Username</label>
                <input type="email" className="input" {...emailForm.register('smtpUser')} placeholder="you@gmail.com" />
              </div>
              <div>
                <label className="label">Password / App Password</label>
                <div className="relative">
                  <input type={showSmtpPass ? 'text' : 'password'} className="input pr-10" {...emailForm.register('smtpPass')} placeholder="Your SMTP password" />
                  <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">From Name</label>
                <input className="input" {...emailForm.register('fromName')} placeholder="Your Agency" />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="secure" className="w-4 h-4 rounded" {...emailForm.register('secure')} />
                <label htmlFor="secure" className="text-sm text-gray-700 dark:text-gray-300">Use SSL/TLS (port 465)</label>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Email Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* WhatsApp Settings */}
      {activeTab === 'whatsapp' && (
        <div className="card p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-gray-900 dark:text-white">WhatsApp API Settings</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connect any WhatsApp Business API provider (Wati, 2Chat, Twilio, etc.)</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-5">
            <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">📱 Supported providers:</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Wati.io, 2Chat.io, Twilio, UltraMsg, ChatAPI, or any provider that accepts a POST request with phone & message in JSON body and Bearer token auth.</p>
          </div>

          <form onSubmit={whatsappForm.handleSubmit(data => saveSection('whatsapp', data))} className="space-y-4">
            <div>
              <label className="label">API URL</label>
              <input className="input" {...whatsappForm.register('apiUrl')} placeholder="https://api.yourprovider.com/v1/send" />
            </div>
            <div>
              <label className="label">API Key / Bearer Token</label>
              <div className="relative">
                <input type={showApiKey ? 'text' : 'password'} className="input pr-10" {...whatsappForm.register('apiKey')} placeholder="Your API key" />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Sender Number</label>
              <input className="input" {...whatsappForm.register('senderNumber')} placeholder="+91 9999999999" />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save WhatsApp Settings
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
