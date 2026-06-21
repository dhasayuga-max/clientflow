import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceItem {
  serviceName: string;
  serviceDescription?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  client: mongoose.Types.ObjectId;
  clientName: string;
  companyName: string;
  email: string;
  whatsappNumber: string;
  address: string;
  invoiceDate: Date;
  dueDate: Date;
  services: IServiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'overdue';
  notes?: string;
  lastReminderSent?: Date;
  reminderCount: number;
  paidAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceItemSchema = new Schema<IServiceItem>({
  serviceName: { type: String, required: true },
  serviceDescription: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
}, { _id: false });

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    clientName: { type: String, required: true },
    companyName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    whatsappNumber: { type: String, required: true },
    address: { type: String, required: true },
    invoiceDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    services: { type: [ServiceItemSchema], required: true, default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
    notes: { type: String },
    lastReminderSent: { type: Date },
    reminderCount: { type: Number, default: 0 },
    paidAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

InvoiceSchema.index({ status: 1, createdBy: 1 });
InvoiceSchema.index({ client: 1 });
InvoiceSchema.index({ dueDate: 1, status: 1 });
InvoiceSchema.index({ clientName: 'text', invoiceNumber: 'text', companyName: 'text' });

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
