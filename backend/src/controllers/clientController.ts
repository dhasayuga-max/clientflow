import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Client from '../models/Client';
import Invoice from '../models/Invoice';
import Proposal from '../models/Proposal';
import { createError } from '../middleware/errorHandler';

export async function getClients(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const query: Record<string, unknown> = { createdBy: req.user!.id };
    if (search) {
      query.$text = { $search: String(search) };
    }

    const [clients, total] = await Promise.all([
      Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Client.countDocuments(query),
    ]);

    res.json({ success: true, data: clients, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
}

export async function getClient(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await Client.findOne({ _id: req.params.id, createdBy: req.user!.id });
    if (!client) throw createError('Client not found', 404);
    res.json({ success: true, data: client });
  } catch (error) { next(error); }
}

export async function createClient(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await Client.create({ ...req.body, createdBy: req.user!.id });
    res.status(201).json({ success: true, message: 'Client created', data: client });
  } catch (error) { next(error); }
}

export async function updateClient(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user!.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) throw createError('Client not found', 404);
    res.json({ success: true, message: 'Client updated', data: client });
  } catch (error) { next(error); }
}

export async function deleteClient(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, createdBy: req.user!.id });
    if (!client) throw createError('Client not found', 404);
    res.json({ success: true, message: 'Client deleted' });
  } catch (error) { next(error); }
}

export async function getClientHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const clientId = req.params.id;
    const client = await Client.findOne({ _id: clientId, createdBy: req.user!.id });
    if (!client) throw createError('Client not found', 404);

    const [invoices, proposals] = await Promise.all([
      Invoice.find({ client: clientId, createdBy: req.user!.id }).sort({ createdAt: -1 }),
      Proposal.find({ client: clientId, createdBy: req.user!.id }).sort({ createdAt: -1 }),
    ]);

    const totalRevenue = invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const pendingRevenue = invoices
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    res.json({
      success: true,
      data: { client, invoices, proposals, stats: { totalRevenue, pendingRevenue, totalInvoices: invoices.length, totalProposals: proposals.length } },
    });
  } catch (error) { next(error); }
}
