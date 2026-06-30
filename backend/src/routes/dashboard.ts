import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Invoice from '../models/Invoice';
import Proposal from '../models/Proposal';
import Client from '../models/Client';
import ReminderLog from '../models/ReminderLog';

const router = Router();
router.use(authenticate);

async function getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const [
      totalInvoices, paidInvoices, pendingInvoices, overdueInvoices,
      totalProposals, sentProposals, acceptedProposals, rejectedProposals,
      totalClients,
      recentInvoices, recentProposals, recentActivity
    ] = await Promise.all([
      Invoice.countDocuments({ createdBy: userId }),
      Invoice.countDocuments({ createdBy: userId, status: 'paid' }),
      Invoice.countDocuments({ createdBy: userId, status: 'pending' }),
      Invoice.countDocuments({ createdBy: userId, status: 'overdue' }),
      Proposal.countDocuments({ createdBy: userId }),
      Proposal.countDocuments({ createdBy: userId, status: 'sent' }),
      Proposal.countDocuments({ createdBy: userId, status: 'accepted' }),
      Proposal.countDocuments({ createdBy: userId, status: 'rejected' }),
      Client.countDocuments({ createdBy: userId }),
      Invoice.find({ createdBy: userId }).sort({ createdAt: -1 }).limit(5),
      Proposal.find({ createdBy: userId }).sort({ createdAt: -1 }).limit(5),
      ReminderLog.find().sort({ sentAt: -1 }).limit(10).populate('invoice', 'invoiceNumber clientName'),
    ]);

    // Revenue calculations
    const revenueAgg = await Invoice.aggregate([
      { $match: { createdBy: req.user!.id as unknown as import('mongoose').Types.ObjectId } },
      { $group: {
        _id: '$status',
        total: { $sum: '$totalAmount' },
      }},
    ]);

    let totalRevenue = 0, pendingRevenue = 0;
    revenueAgg.forEach((r) => {
      if (r._id === 'paid') totalRevenue = r.total;
      if (r._id === 'pending' || r._id === 'overdue') pendingRevenue += r.total;
    });

    // Monthly revenue for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Invoice.aggregate([
      { $match: { createdBy: req.user!.id as unknown as import('mongoose').Types.ObjectId, status: 'paid', paidAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
        revenue: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        invoices: { total: totalInvoices, paid: paidInvoices, pending: pendingInvoices, overdue: overdueInvoices },
        proposals: { total: totalProposals, sent: sentProposals, accepted: acceptedProposals, rejected: rejectedProposals },
        revenue: { total: totalRevenue, pending: pendingRevenue },
        clients: { total: totalClients },
        monthlyRevenue,
        recentInvoices,
        recentProposals,
        recentActivity,
      },
    });
  } catch (error) { next(error); }
}

router.get('/', getDashboard);

export default router;
