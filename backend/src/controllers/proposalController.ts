import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Proposal from '../models/Proposal';
import { createError } from '../middleware/errorHandler';
import { generateProposalNumber } from '../utils/numberGenerator';
import { generateProposalPPTX } from '../services/proposalPptxService';
import { generateProposalPDF } from '../services/proposalPdfService';
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
    const proposal = await Proposal.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!proposal) throw createError('Proposal not found', 404);
    res.json({ success: true, data: proposal });
  } catch (error) { next(error); }
}

export async function createProposal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposalNumber = await generateProposalNumber();
    const proposal = await Proposal.create({ ...req.body, proposalNumber, createdBy: req.user!.id });
    res.status(201).json({ success: true, message: 'Proposal created', data: proposal });
  } catch (error) { next(error); }
}

export async function updateProposal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposal = await Proposal.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user!.id },
      req.body, { new: true, runValidators: true }
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
    if (!['draft', 'sent', 'accepted', 'rejected'].includes(status)) throw createError('Invalid status', 400);
    const proposal = await Proposal.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user!.id },
      { status }, { new: true }
    );
    if (!proposal) throw createError('Proposal not found', 404);
    res.json({ success: true, message: `Marked as ${status}`, data: proposal });
  } catch (error) { next(error); }
}

export async function duplicateProposal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const original = await Proposal.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!original) throw createError('Proposal not found', 404);
    const proposalNumber = await generateProposalNumber();
    const dup = await Proposal.create({
      proposalNumber,
      clientName: original.clientName,
      companyName: original.companyName,
      videoCount: original.videoCount,
      monthlyPrice: original.monthlyPrice,
      belowAdSpend: original.belowAdSpend,
      monthlyCharge: original.monthlyCharge,
      aboveAdSpend: original.aboveAdSpend,
      percentageCharge: original.percentageCharge,
      services: original.services,
      proposalDate: new Date(),
      status: 'draft',
      notes: original.notes,
      createdBy: req.user!.id,
    });
    res.status(201).json({ success: true, message: 'Proposal duplicated', data: dup });
  } catch (error) { next(error); }
}

export async function downloadProposalPPTX(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposal = await Proposal.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!proposal) throw createError('Proposal not found', 404);
    const settings = await Settings.findOne({ userId: req.user!.id });
    const buf = await generateProposalPPTX(proposal, settings);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${proposal.proposalNumber}.pptx"`);
    res.send(buf);
  } catch (error) { next(error); }
}

export async function downloadProposalPDFRoute(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const proposal = await Proposal.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!proposal) throw createError('Proposal not found', 404);
    const settings = await Settings.findOne({ userId: req.user!.id });
    const buf = await generateProposalPDF(proposal, settings);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${proposal.proposalNumber}.pdf"`);
    res.send(buf);
  } catch (error) { next(error); }
}
