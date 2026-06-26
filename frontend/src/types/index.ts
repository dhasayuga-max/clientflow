export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Client {
  _id: string;
  name: string;
  companyName: string;
  email: string;
  whatsappNumber: string;
  phone?: string;
  address: string;
  state?: string;
  gstNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  serviceName: string;
  serviceDescription?: string;
  hsnSac?: string;
  quantity: number;
  unit?: string;
  price: number;
  total: number;
}

export interface BankDetails {
  bankName?: string;
  accountNumber?: string;
  branchIfsc?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  client?: Client;
  clientName: string;
  companyName: string;
  email: string;
  whatsappNumber: string;
  address: string;
  state?: string;
  invoiceDate: string;
  dueDate: string;
  reference?: string;
  paymentMethod?: string;
  services: ServiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  bankDetails?: BankDetails;
  status: 'pending' | 'paid' | 'overdue';
  notes?: string;
  lastReminderSent?: string;
  reminderCount: number;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategory {
  name: string;
  bullets: string[];
  order: number;
}

export interface Proposal {
  _id: string;
  proposalNumber: string;
  client?: Client;
  clientName: string;
  companyName: string;
  videoCount: string;
  monthlyPrice: number;
  belowAdSpend: number;
  monthlyCharge: number;
  aboveAdSpend: number;
  percentageCharge: number;
  services: ServiceCategory[];
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  notes?: string;
  proposalDate: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  company: {
    name: string;
    logo?: string;
    address: string;
    state?: string;
    gstNumber?: string;
    phone: string;
    website?: string;
    email?: string;
  };
  bankDetails: {
    bankName?: string;
    accountNumber?: string;
    branchIfsc?: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    fromName?: string;
    secure: boolean;
  };
  whatsapp: {
    apiUrl: string;
    apiKey: string;
    senderNumber: string;
  };
}

export interface DashboardStats {
  invoices: { total: number; paid: number; pending: number; overdue: number };
  proposals: { total: number; sent: number; accepted: number; rejected: number };
  revenue: { total: number; pending: number };
  clients: { total: number };
  monthlyRevenue: Array<{ _id: { year: number; month: number }; revenue: number; count: number }>;
  recentInvoices: Invoice[];
  recentProposals: Proposal[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
