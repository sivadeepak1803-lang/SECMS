const express = require('express');
const db = require('../config/db');
const { cleanStr } = require('../utils/validate');
const { hashPassword, verifyPassword } = require('../utils/helpers');

const router = express.Router();

router.put('/settings/profile', (req, res) => {
  const b = req.body || {};
  const name = cleanStr(b.name);
  const email = cleanStr(b.email).toLowerCase();
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  db.prepare('UPDATE admins SET name = ?, email = ? WHERE id = ?').run(name, email, req.session.adminId);

  const admin = db
    .prepare('SELECT id, username, name, email FROM admins WHERE id = ?')
    .get(req.session.adminId);
  res.json({ success: true, admin, message: 'Profile updated successfully.' });
});

router.put('/settings/password', (req, res) => {
  const b = req.body || {};
  const current = cleanStr(b.currentPassword);
  const next = cleanStr(b.newPassword);

  if (!current) return res.status(400).json({ error: 'Enter your current password.' });
  if (next.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });

  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.adminId);
  if (!verifyPassword(current, admin.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hashPassword(next), admin.id);
  res.json({ success: true, message: 'Password changed successfully.' });
});

module.exports = router;