import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Settings from '../models/Settings';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

function generateToken(id: string, email: string, name: string): string {
  const secret: jwt.Secret = process.env.JWT_SECRET || 'secret';
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ id, email, name }, secret, options);
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw createError('Name, email and password are required', 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) throw createError('Email already registered', 409);

    const user = await User.create({ name, email, password });
    
    // Create default settings for new user
    await Settings.create({ userId: user._id, company: { name }, email: {}, whatsapp: {} });

    const token = generateToken(String(user._id), user.email, user.name);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { token, user: { id: user._id, name: user.name, email: user.email } },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) throw createError('Email and password are required', 400);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw createError('Invalid credentials', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw createError('Invalid credentials', 401);

    const token = generateToken(String(user._id), user.email, user.name);

    res.json({
      success: true,
      message: 'Login successful',
      data: { token, user: { id: user._id, name: user.name, email: user.email } },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.id).select('-password');
    if (!user) throw createError('User not found', 404);

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function updatePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw createError('Both passwords are required', 400);
    if (newPassword.length < 6) throw createError('Password must be at least 6 characters', 400);

    const user = await User.findById(req.user!.id);
    if (!user) throw createError('User not found', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw createError('Current password is incorrect', 401);

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
}
