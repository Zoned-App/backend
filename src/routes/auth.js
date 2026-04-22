const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const users = require('../db/users');

// ── Helpers ──────────────────────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  );
}

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// ── POST /auth/signup ─────────────────────────────────────────────────────────

router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body ?? {};

  // Validation
  if (!username?.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!email?.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Check duplicate
  if (users.findByEmail(email)) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = users.create({ username: username.trim(), email, passwordHash });
  const token = signToken(user);

  return res.status(201).json({ token, user: safeUser(user) });
});

// ── POST /auth/login ──────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = users.findByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  return res.json({ token, user: safeUser(user) });
});

// ── GET /auth/me (protected) ──────────────────────────────────────────────────

const requireAuth = require('../middleware/requireAuth');

router.get('/me', requireAuth, (req, res) => {
  const user = users.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: safeUser(user) });
});

module.exports = router;
