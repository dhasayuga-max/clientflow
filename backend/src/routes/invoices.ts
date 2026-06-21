import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  markAsPaid, markAsPending, downloadInvoicePDF, sendInvoiceEmail, sendInvoiceWhatsApp
} from '../controllers/invoiceController';

const router = Router();
router.use(authenticate);

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);
router.patch('/:id/mark-paid', markAsPaid);
router.patch('/:id/mark-pending', markAsPending);
router.get('/:id/pdf', downloadInvoicePDF);
router.post('/:id/send-email', sendInvoiceEmail);
router.post('/:id/send-whatsapp', sendInvoiceWhatsApp);

export default router;
