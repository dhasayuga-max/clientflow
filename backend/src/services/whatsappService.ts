import axios from 'axios';
import { IInvoice } from '../models/Invoice';
import { IProposal } from '../models/Proposal';
import { ISettings } from '../models/Settings';
import { logger } from '../utils/logger';

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export async function sendWhatsApp(
  document: IInvoice | IProposal,
  settings: ISettings,
  type: 'invoice' | 'proposal' | 'reminder'
): Promise<void> {
  const { apiUrl, apiKey, senderNumber } = settings.whatsapp;

  if (!apiUrl || !apiKey || !senderNumber) {
    throw new Error('WhatsApp API settings are not configured');
  }

  let message: string;
  let toNumber: string;

  if (type === 'invoice' || type === 'reminder') {
    const invoice = document as IInvoice;
    toNumber = invoice.whatsappNumber;

    if (type === 'reminder') {
      message = `Hello ${invoice.clientName},\n\nThis is a friendly reminder regarding Invoice #${invoice.invoiceNumber} for ${formatCurrency(invoice.totalAmount)}.\n\nKindly make the payment at your earliest convenience.\n\nThank you.\n\n${settings.company?.name || ''}`;
    } else {
      message = `Hello ${invoice.clientName},\n\nPlease find your Invoice #${invoice.invoiceNumber} for ${formatCurrency(invoice.totalAmount)}.\n\nDue Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}\n\nThank you for your business!\n\n${settings.company?.name || ''}`;
    }
  } else {
    const proposal = document as IProposal;
    toNumber = proposal.phone;
    message = `Hello ${proposal.clientName},\n\nPlease review our Business Proposal #${proposal.proposalNumber}.\n\nTotal Investment: ${formatCurrency(proposal.totalAmount)}\n\nWe look forward to working with you!\n\n${settings.company?.name || ''}`;
  }

  // Generic WhatsApp API call — adapter pattern
  // This works with most WhatsApp Business API providers (Wati, Twilio, 2Chat, etc.)
  // Adjust the payload structure based on your provider
  await axios.post(
    apiUrl,
    {
      phone: toNumber,
      message,
      // For media-based APIs: add pdfUrl if needed
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );

  logger.info(`WhatsApp sent to ${toNumber} for ${type}`);
}
