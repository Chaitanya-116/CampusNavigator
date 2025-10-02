import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'token';
const COOKIE_DAYS = Number(process.env.AUTH_COOKIE_DAYS || 7);

function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: `${COOKIE_DAYS}d` });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // set true when behind HTTPS
    maxAge: COOKIE_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: false });
}

function authMiddleware(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (e) {
    // ignore invalid token; treated as unauthenticated
  }
  next();
}

router.use(authMiddleware);

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, message: 'Name, email and password are required.' });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      return res.status(409).json({ ok: false, message: 'An account with this email already exists.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: emailNorm, passwordHash: hash });
    setAuthCookie(res, { id: user._id, email: user.email, name: user.name });
    return res.status(201).json({ ok: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Signup error', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Email and password are required.' });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: emailNorm });
    if (!user) return res.status(401).json({ ok: false, message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ ok: false, message: 'Invalid credentials.' });

    setAuthCookie(res, { id: user._id, email: user.email, name: user.name });
    return res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, message: 'Not authenticated' });
    const dbUser = await User.findById(req.user.id).select('_id name email');
    if (!dbUser) return res.status(401).json({ ok: false, message: 'Not authenticated' });
    return res.json({ ok: true, user: { id: dbUser._id, name: dbUser.name, email: dbUser.email } });
  } catch (err) {
    console.error('Me error', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

export default router;
