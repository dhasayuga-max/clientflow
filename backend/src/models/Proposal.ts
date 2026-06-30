import mongoose, { Schema, Document } from 'mongoose';

// A service category with bullet points (for the Meta Ads section)
export interface IServiceCategory {
  name: string;
  bullets: string[];
  order: number;
}

export interface IProposal extends Document {
  proposalNumber: string;
  client: mongoose.Types.ObjectId;

  // Cover page
  clientName: string;
  companyName: string;

  // Monthly Video Package section
  videoCount: string;       // e.g. "12 Videos / Month"
  monthlyPrice: number;     // e.g. 57000

  // Meta Ads pricing section
  belowAdSpend: number;     // e.g. 30000
  monthlyCharge: number;    // e.g. 10000
  aboveAdSpend: number;     // e.g. 30000
  percentageCharge: number; // e.g. 20

  // Dynamic services (fully editable categories + bullets)
  services: IServiceCategory[];

  // Metadata
  // Editor state (Fabric.js canvas JSON for the in-browser editor)
  editorData?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  notes?: string;
  proposalDate: Date;
  validUntil?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceCategorySchema = new Schema<IServiceCategory>({
  name: { type: String, required: true },
  bullets: { type: [String], default: [] },
  order: { type: Number, default: 0 },
}, { _id: false });

const ProposalSchema = new Schema<IProposal>(
  {
    proposalNumber: { type: String, required: true, unique: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    clientName: { type: String, required: true },
    companyName: { type: String, required: true },
    videoCount: { type: String, default: '12 Videos / Month' },
    monthlyPrice: { type: Number, default: 57000 },
    belowAdSpend: { type: Number, default: 30000 },
    monthlyCharge: { type: Number, default: 10000 },
    aboveAdSpend: { type: Number, default: 30000 },
    percentageCharge: { type: Number, default: 20 },
    services: {
      type: [ServiceCategorySchema],
      default: [
        { name: 'Initial Consultation', bullets: ['Understand client goals', 'Review existing marketing efforts'], order: 0 },
        { name: 'Ad Creation & Optimization', bullets: ['Ad copy & creative optimization', 'Landing page optimization', 'Ad formats'], order: 1 },
        { name: 'Campaign Structure & Strategy', bullets: ['Campaign objectives', 'Ad sets & targeting', 'Budget & scheduling'], order: 2 },
        { name: 'Account Setup & Optimization', bullets: ['Meta Business Account setup', 'Ad account configuration'], order: 3 },
        { name: 'Tracking & Analytics', bullets: ['Pixel & conversion tracking', 'Link Meta Ads and Analytics', 'Monitor key metrics'], order: 4 },
        { name: 'Campaign Management', bullets: ['Budget management & bidding', 'Ad placement & optimization', 'Ongoing management & optimization', 'Reporting & analysis', 'Client communication'], order: 5 },
      ],
    },
    editorData: { type: String },
    status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft' },
    notes: { type: String },
    proposalDate: { type: Date, default: Date.now },
    validUntil: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ProposalSchema.index({ status: 1, createdBy: 1 });
ProposalSchema.index({ client: 1 });
ProposalSchema.index({ clientName: 'text', proposalNumber: 'text', companyName: 'text' });

export default mongoose.model<IProposal>('Proposal', ProposalSchema);

