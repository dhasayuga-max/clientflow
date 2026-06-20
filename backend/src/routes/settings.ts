import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Settings from '../models/Settings';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(authenticate);

// Multer for logo upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../uploads/logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images allowed'));
}});

async function getSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let settings = await Settings.findOne({ userId: req.user!.id });
    if (!settings) {
      settings = await Settings.create({ userId: req.user!.id });
    }
    // Don't send SMTP password in response
    const settingsObj = settings.toObject();
    if (settingsObj.email?.smtpPass) {
      settingsObj.email.smtpPass = '••••••••';
    }
    res.json({ success: true, data: settingsObj });
  } catch (error) { next(error); }
}

async function updateSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { section, data } = req.body;
    
    const update: Record<string, unknown> = {};
    if (section === 'company') update.company = data;
    else if (section === 'email') update.email = data;
    else if (section === 'whatsapp') update.whatsapp = data;
    else Object.assign(update, req.body);

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user!.id },
      update,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, message: 'Settings saved', data: settings });
  } catch (error) { next(error); }
}

async function uploadLogo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
    
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await Settings.findOneAndUpdate(
      { userId: req.user!.id },
      { 'company.logo': logoUrl },
      { upsert: true }
    );

    res.json({ success: true, message: 'Logo uploaded', data: { logoUrl } });
  } catch (error) { next(error); }
}

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/logo', upload.single('logo'), uploadLogo);

export default router;
