import nodemailer from 'nodemailer';
import { IInvoice } from '../models/Invoice';
import { IProposal } from '../models/Proposal';
import { ISettings } from '../models/Settings';
import { logger } from '../utils/logger';

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export async function sendEmail(
  document: IInvoice | IProposal,
  settings: ISettings,
  pdfBuffer: Buffer,
  type: 'invoice' | 'proposal' | 'reminder'
): Promise<void> {
  const { smtpHost, smtpPort, smtpUser, smtpPass, fromName, secure } = settings.email;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error('Email SMTP settings are not configured');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort || 587,
    secure: secure || false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  let subject: string;
  let htmlBody: string;
  let filename: string;
  let toEmail: string;

  if (type === 'invoice' || type === 'reminder') {
    const invoice = document as IInvoice;
    toEmail = invoice.email;
    filename = `${invoice.invoiceNumber}.pdf`;

    if (type === 'reminder') {
      subject = `Payment Reminder - Invoice #${invoice.invoiceNumber}`;
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Payment Reminder</h2>
          <p>Hello <strong>${invoice.clientName}</strong>,</p>
          <p>This is a friendly reminder regarding Invoice <strong>#${invoice.invoiceNumber}</strong> for <strong>${formatCurrency(invoice.totalAmount)}</strong>.</p>
          <p>Kindly make the payment at your earliest convenience.</p>
          <p>Thank you.</p>
          <hr style="border-color: #E5E7EB;"/>
          <p style="color: #6B7280; font-size: 12px;">${settings.company?.name || ''}</p>
        </div>`;
    } else {
      subject = `Invoice #${invoice.invoiceNumber} from ${settings.company?.name || 'Us'}`;
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Invoice #${invoice.invoiceNumber}</h2>
          <p>Hello <strong>${invoice.clientName}</strong>,</p>
          <p>Please find attached your invoice for <strong>${formatCurrency(invoice.totalAmount)}</strong>.</p>
          <p>Due date: <strong>${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</strong></p>
          <p>Thank you for your business!</p>
          <hr style="border-color: #E5E7EB;"/>
          <p style="color: #6B7280; font-size: 12px;">${settings.company?.name || ''}</p>
        </div>`;
    }
  } else {
    const proposal = document as IProposal;
    toEmail = proposal.email;
    filename = `${proposal.proposalNumber}.pdf`;
    subject = `Business Proposal #${proposal.proposalNumber} from ${settings.company?.name || 'Us'}`;
    htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Business Proposal</h2>
        <p>Hello <strong>${proposal.clientName}</strong>,</p>
        <p>Please find attached our business proposal <strong>#${proposal.proposalNumber}</strong>.</p>
        <p>Total: <strong>${formatCurrency(proposal.totalAmount)}</strong></p>
        <p>We look forward to working with you!</p>
        <hr style="border-color: #E5E7EB;"/>
        <p style="color: #6B7280; font-size: 12px;">${settings.company?.name || ''}</p>
      </div>`;
  }

  await transporter.sendMail({
    from: `"${fromName || settings.company?.name || 'ClientFlow'}" <${smtpUser}>`,
    to: toEmail,
    subject,
    html: htmlBody,
    attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
  });

  logger.info(`Email sent to ${toEmail} for ${type} ${filename}`);
}
