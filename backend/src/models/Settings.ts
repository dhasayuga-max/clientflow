import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  userId: mongoose.Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    company: {
      name: { type: String, default: '' },
      logo: { type: String },
      address: { type: String, default: '' },
      state: { type: String, default: '' },
      gstNumber: { type: String },
      phone: { type: String, default: '' },
      website: { type: String },
      email: { type: String },
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      branchIfsc: { type: String, default: '' },
    },
    email: {
      smtpHost: { type: String, default: '' },
      smtpPort: { type: Number, default: 587 },
      smtpUser: { type: String, default: '' },
      smtpPass: { type: String, default: '' },
      fromName: { type: String },
      secure: { type: Boolean, default: false },
    },
    whatsapp: {
      apiUrl: { type: String, default: '' },
      apiKey: { type: String, default: '' },
      senderNumber: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>('Settings', SettingsSchema);
