import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
  name: string;
  companyName: string;
  email: string;
  whatsappNumber: string;
  phone?: string;
  address: string;
  state?: string;
  gstNumber?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    whatsappNumber: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, required: true },
    state: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ClientSchema.index({ email: 1, createdBy: 1 });
ClientSchema.index({ name: 'text', companyName: 'text', email: 'text' });

export default mongoose.model<IClient>('Client', ClientSchema);
