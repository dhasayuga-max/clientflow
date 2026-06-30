import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Invoice from '../models/Invoice';
import Client from '../models/Client';
import { createError } from '../middleware/errorHandler';
import { generateInvoiceNumber } from '../utils/numberGenerator';
import { generateInvoicePDF } from '../services/pdfService';
import { sendEmail } from '../services/emailService';
import { sendWhatsApp } from '../services/whatsappService';
import Settings from '../models/Settings';

export async function getInvoices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: Record<string, unknown> = { createdBy: req.user!.id };
    if (status) query.status = status;
    if (search) query.$text = { $search: String(search) };

    const [invoices, total] = await Promise.all([
      Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Invoice.countDocuments(query),
    ]);

    res.json({ success: true, data: invoices, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
}

export async function getInvoice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user!.id }).populate('client');
    if (!invoice) throw createError('Invoice not found', 404);
    res.json({ success: true, data: invoice });
  } catch (error) { next(error); }
}

export async function createInvoice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    
    // Auto-detect or create client
    let clientId = req.body.clientId;
    if (!clientId && req.body.email) {
      let client = await Client.findOne({ email: req.body.email, createdBy: req.user!.id });
      if (!client) {
        client = await Client.create({
          name: req.body.clientName,
          companyName: req.body.companyName,
          email: req.body.email,
          whatsappNumber: req.body.whatsappNumber,
          address: req.body.address,
          state: req.body.state,
          createdBy: req.user!.id,
        });
      }
      clientId = client._id;
    }

    // Calculate totals
    const services = req.body.services || [];
    const subtotal = services.reduce((sum: number, s: { total: number }) => sum + s.total, 0);
    const taxRate = req.body.taxRate || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    const paidAmount = req.body.status === 'paid' ? totalAmount : (req.body.paidAmount || 0);

    // Fall back to default bank details from Settings if invoice didn't supply any
    let bankDetails = req.body.bankDetails;
    const hasBankInfo = bankDetails && (bankDetails.bankName || bankDetails.accountNumber || bankDetails.branchIfsc);
    if (!hasBankInfo) {
      const settings = await Settings.findOne({ userId: req.user!.id });
      if (settings?.bankDetails) bankDetails = settings.bankDetails;
    }

    const invoice = await Invoice.create({
      ...req.body,
      invoiceNumber,
      client: clientId,
      subtotal,
      taxAmount,
      totalAmount,
      paidAmount,
      bankDetails,
      createdBy: req.user!.id,
    });

    res.status(201).json({ success: true, message: 'Invoice created', data: invoice });
  } catch (error) { next(error); }
}

export async function updateInvoice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // Recalculate totals if services changed
    if (req.body.services) {
      const subtotal = req.body.services.reduce((sum: number, s: { total: number }) => sum + s.total, 0);
      const taxRate = req.body.taxRate || 0;
      req.body.subtotal = subtotal;
      req.body.taxAmount = (subtotal * taxRate) / 100;
      req.body.totalAmount = subtotal + req.body.taxAmount;
    }

    if (req.body.status === 'paid' && req.body.paidAmount === undefined) {
      const current = await Invoice.findOne({ _id: req.params.id, createdBy: req.user!.id });
      req.body.paidAmount = req.body.totalAmount ?? current?.totalAmount ?? 0;
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user!.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!invoice) throw createError('Invoice not found', 404);
    res.json({ success: true, message: 'Invoice updated', data: invoice });
  } catch (error) { next(error); }
}

export async function deleteInvoice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, createdBy: req.user!.id });
    if (!invoice) throw createError('Invoice not found', 404);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) { next(error); }
}

export async function markAsPaid(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await Invoice.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!existing) throw createError('Invoice not found', 404);

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user!.id },
      { status: 'paid', paidAt: new Date(), paidAmount: existing.totalAmount },
      { new: true }
    );
    res.json({ success: true, message: 'Invoice marked as paid', data: invoice });
  } catch (error) { next(error); }
}

export async function markAsPending(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user!.id },
      { status: 'pending', paidAt: undefined, paidAmount: 0 },
      { new: true }
    );
    if (!invoice) throw createError('Invoice not found', 404);
    res.json({ success: true, message: 'Invoice marked as pending', data: invoice });
  } catch (error) { next(error); }
}

export async function downloadInvoicePDF(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!invoice) throw createError('Invoice not found', 404);

    const settings = await Settings.findOne({ userId: req.user!.id });
    const pdfBuffer = await generateInvoicePDF(invoice, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) { next(error); }
}

export async function sendInvoiceEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!invoice) throw createError('Invoice not found', 404);

    const settings = await Settings.findOne({ userId: req.user!.id });
    if (!settings?.email?.smtpHost) throw createError('Email SMTP not configured. Please go to Settings.', 400);

    const pdfBuffer = await generateInvoicePDF(invoice, settings);
    await sendEmail(invoice, settings, pdfBuffer, 'invoice');

    res.json({ success: true, message: `Invoice sent to ${invoice.email}` });
  } catch (error) { next(error); }
}

export async function sendInvoiceWhatsApp(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!invoice) throw createError('Invoice not found', 404);

    const settings = await Settings.findOne({ userId: req.user!.id });
    if (!settings?.whatsapp?.apiUrl) throw createError('WhatsApp API not configured. Please go to Settings.', 400);

    await sendWhatsApp(invoice, settings, 'invoice');

    res.json({ success: true, message: `WhatsApp sent to ${invoice.whatsappNumber}` });
  } catch (error) { next(error); }
}
