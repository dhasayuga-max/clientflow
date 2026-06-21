import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Proposal from '../models/Proposal';
import Client from '../models/Client';
import { createError } from '../middleware/errorHandler';
import { generateProposalNumber } from '../utils/numberGenerator';
import { generateProposalPDF } from '../services/pdfService';
import { sendEmail } from '../services/emailService';
import { sendWhatsApp } from '../services/whatsappService';
import Settings from '../models/Settings';

export async function getProposals(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: Record<string, unknown> = { createdBy: req.user!.id };
    if (status) query.status = status;
    if (search) query.$text = { $search: String(search) };

    const [proposals, total] = await Promise.all([
      Proposal.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Proposal.countDocuments(query),
    ]);

    res.json({ success: true, data: proposals, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
}

export async function getProposal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposal = await Proposal.findOne({ _id: req.params.id, createdBy: req.user!.id }).populate('client');
    if (!proposal) throw createError('Proposal not found', 404);
    res.json({ success: true, data: proposal });
  } catch (error) { next(error); }
}

export async function createProposal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposalNumber = await generateProposalNumber();

    let clientId = req.body.clientId;
    if (!clientId && req.body.email) {
      let client = await Client.findOne({ email: req.body.email, createdBy: req.user!.id });
      if (!client) {
        client = await Client.create({
          name: req.body.clientName,
          companyName: req.body.companyName,
          email: req.body.email,
          whatsappNumber: req.body.phone || '',
          address: req.body.address,
          createdBy: req.user!.id,
        });
      }
      clientId = client._id;
    }

    const services = req.body.services || [];
    const totalAmount = services.reduce((sum: number, s: { price: number }) => sum + s.price, 0);

    const proposal = await Proposal.create({
      ...req.body,
      proposalNumber,
      client: clientId,
      totalAmount,
      createdBy: req.user!.id,
    });

    res.status(201).json({ success: true, message: 'Proposal created', data: proposal });
  } catch (error) { next(error); }
}

export async function updateProposal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.body.services) {
      req.body.totalAmount = req.body.services.reduce((sum: number, s: { price: number }) => sum + s.price, 0);
    }

    const proposal = await Proposal.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user!.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!proposal) throw createError('Proposal not found', 404);
    res.json({ success: true, message: 'Proposal updated', data: proposal });
  } catch (error) { next(error); }
}

export async function deleteProposal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposal = await Proposal.findOneAndDelete({ _id: req.params.id, createdBy: req.user!.id });
    if (!proposal) throw createError('Proposal not found', 404);
    res.json({ success: true, message: 'Proposal deleted' });
  } catch (error) { next(error); }
}

export async function updateProposalStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body;
    if (!['draft', 'sent', 'accepted', 'rejected'].includes(status)) {
      throw createError('Invalid status', 400);
    }

    const proposal = await Proposal.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user!.id },
      { status },
      { new: true }
    );
    if (!proposal) throw createError('Proposal not found', 404);
    res.json({ success: true, message: `Proposal marked as ${status}`, data: proposal });
  } catch (error) { next(error); }
}

export async function duplicateProposal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const original = await Proposal.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!original) throw createError('Proposal not found', 404);

    const proposalNumber = await generateProposalNumber();
    const duplicate = await Proposal.create({
      proposalNumber,
      client: original.client,
      clientName: original.clientName,
      companyName: original.companyName,
      address: original.address,
      phone: original.phone,
      email: original.email,
      services: original.services,
      totalAmount: original.totalAmount,
      proposalDate: new Date(),
      status: 'draft',
      notes: original.notes,
      createdBy: req.user!.id,
    });

    res.status(201).json({ success: true, message: 'Proposal duplicated', data: duplicate });
  } catch (error) { next(error); }
}

export async function downloadProposalPDF(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposal = await Proposal.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!proposal) throw createError('Proposal not found', 404);

    const settings = await Settings.findOne({ userId: req.user!.id });
    const pdfBuffer = await generateProposalPDF(proposal, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${proposal.proposalNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) { next(error); }
}

export async function sendProposalEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposal = await Proposal.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!proposal) throw createError('Proposal not found', 404);

    const settings = await Settings.findOne({ userId: req.user!.id });
    if (!settings?.email?.smtpHost) throw createError('Email SMTP not configured. Please go to Settings.', 400);

    const pdfBuffer = await generateProposalPDF(proposal, settings);
    await sendEmail(proposal, settings, pdfBuffer, 'proposal');

    if (proposal.status === 'draft') {
      await Proposal.findByIdAndUpdate(proposal._id, { status: 'sent' });
    }

    res.json({ success: true, message: `Proposal sent to ${proposal.email}` });
  } catch (error) { next(error); }
}

export async function sendProposalWhatsApp(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposal = await Proposal.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!proposal) throw createError('Proposal not found', 404);

    const settings = await Settings.findOne({ userId: req.user!.id });
    if (!settings?.whatsapp?.apiUrl) throw createError('WhatsApp API not configured. Please go to Settings.', 400);

    await sendWhatsApp(proposal, settings, 'proposal');

    res.json({ success: true, message: `WhatsApp sent to ${proposal.phone}` });
  } catch (error) { next(error); }
}
