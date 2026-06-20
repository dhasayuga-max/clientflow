import Invoice from '../models/Invoice';

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const lastInvoice = await Invoice.findOne(
    { invoiceNumber: new RegExp(`^INV-${year}${month}`) },
    {},
    { sort: { createdAt: -1 } }
  );

  let sequence = 1;
  if (lastInvoice) {
    const lastNum = parseInt(lastInvoice.invoiceNumber.split('-')[2] || '0', 10);
    sequence = lastNum + 1;
  }

  return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

export async function generateProposalNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  // Import dynamically to avoid circular deps
  const Proposal = (await import('../models/Proposal')).default;
  const lastProposal = await Proposal.findOne(
    { proposalNumber: new RegExp(`^PROP-${year}${month}`) },
    {},
    { sort: { createdAt: -1 } }
  );

  let sequence = 1;
  if (lastProposal) {
    const lastNum = parseInt(lastProposal.proposalNumber.split('-')[2] || '0', 10);
    sequence = lastNum + 1;
  }

  return `PROP-${year}${month}-${String(sequence).padStart(4, '0')}`;
}
