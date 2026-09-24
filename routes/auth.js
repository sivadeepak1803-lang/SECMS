const express = require('express');
const db = require('../config/db');
const { verifyPassword } = require('../utils/helpers');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = db
    .prepare('SELECT * FROM admins WHERE username = ?')
    .get(String(username).trim());
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  req.session.adminId = admin.id;
  res.json({
    success: true,
    admin: { id: admin.id, username: admin.username, name: admin.name, email: admin.email },
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true, message: 'Logged out' }));
});

router.get('/me', (req, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const admin = db
    .prepare('SELECT id, username, name, email FROM admins WHERE id = ?')
    .get(req.session.adminId);
  if (!admin) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ admin });
});

module.exports = router;