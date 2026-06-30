import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getProposals, getProposal, createProposal, updateProposal, deleteProposal,
  updateProposalStatus, duplicateProposal, downloadProposalPPTX, downloadProposalPDFRoute
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
router.get('/:id/pptx', downloadProposalPPTX);
router.get('/:id/pdf', downloadProposalPDFRoute);

export default router;
