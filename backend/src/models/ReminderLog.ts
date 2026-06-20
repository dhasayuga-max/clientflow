import mongoose, { Schema, Document } from 'mongoose';

export interface IReminderLog extends Document {
  invoice: mongoose.Types.ObjectId;
  clientName: string;
  type: 'email' | 'whatsapp';
  status: 'sent' | 'failed';
  message?: string;
  error?: string;
  sentAt: Date;
}

const ReminderLogSchema = new Schema<IReminderLog>(
  {
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    clientName: { type: String, required: true },
    type: { type: String, enum: ['email', 'whatsapp'], required: true },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    message: { type: String },
    error: { type: String },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ReminderLogSchema.index({ invoice: 1 });
ReminderLogSchema.index({ sentAt: -1 });

export default mongoose.model<IReminderLog>('ReminderLog', ReminderLogSchema);
