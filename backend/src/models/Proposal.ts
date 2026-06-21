import mongoose, { Schema, Document } from 'mongoose';

export interface IProposalService {
  name: string;
  description?: string;
  price: number;
}

export interface IProposal extends Document {
  proposalNumber: string;
  client: mongoose.Types.ObjectId;
  clientName: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  services: IProposalService[];
  totalAmount: number;
  validUntil?: Date;
  proposalDate: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProposalServiceSchema = new Schema<IProposalService>({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const ProposalSchema = new Schema<IProposal>(
  {
    proposalNumber: { type: String, required: true, unique: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    clientName: { type: String, required: true },
    companyName: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    services: { type: [ProposalServiceSchema], required: true, default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    validUntil: { type: Date },
    proposalDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft' },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ProposalSchema.index({ status: 1, createdBy: 1 });
ProposalSchema.index({ client: 1 });
ProposalSchema.index({ clientName: 'text', proposalNumber: 'text', companyName: 'text' });

export default mongoose.model<IProposal>('Proposal', ProposalSchema);
