import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getProposals, getProposal, createProposal, updateProposal, deleteProposal,
  updateProposalStatus, duplicateProposal, downloadProposalPDF, sendProposalEmail, sendProposalWhatsApp
} from '../controllers/proposalController';

const router = Router();
router.use(authenticate);

router.get('/', getProposals);
router.post('/', createProposal);
router.get('/:id', getProposal);
router.put('/:id', updateProposal);
router.delete('/:id', deleteProposal);
router.patch('/:id/status', updateProposalStatus);
router.post('/:id/duplicate', duplicateProposal);
router.get('/:id/pdf', downloadProposalPDF);
router.post('/:id/send-email', sendProposalEmail);
router.post('/:id/send-whatsapp', sendProposalWhatsApp);

export default router;
