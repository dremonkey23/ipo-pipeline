const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const SECRET = JWT_SECRET || 'ipo_pipeline_dev_secret_2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    SECRET,
    { expiresIn: '30d' }
  );
}

module.exports = function (db) {
  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, plan) VALUES (?, ?, ?)'
      ).run(email.toLowerCase(), password_hash, 'free');

      const user = { id: result.lastInsertRowid, email: email.toLowerCase(), plan: 'free' };
      const token = generateToken(user);

      // Create default preferences
      db.prepare(
        'INSERT INTO user_preferences (user_id) VALUES (?)'
      ).run(user.id);

      res.status(201).json({ token, user });
    } catch (err) {
      console.error('Register error:', err.message);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
      if (!user || !user.password_hash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken(user);
      res.json({
        token,
        user: { id: user.id, email: user.email, plan: user.plan },
      });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // GET /api/auth/me
  router.get('/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, SECRET);
      const user = db.prepare('SELECT id, email, plan, created_at FROM users WHERE id = ?').get(decoded.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  });

  return router;
};
