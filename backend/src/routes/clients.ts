import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getClients, getClient, createClient, updateClient, deleteClient, getClientHistory
} from '../controllers/clientController';

const router = Router();
router.use(authenticate);

router.get('/', getClients);
router.post('/', createClient);
router.get('/:id', getClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);
router.get('/:id/history', getClientHistory);

export default router;
