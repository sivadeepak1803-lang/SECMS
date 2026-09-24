const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const parts = String(stored || '').split(':');
    if (parts.length !== 2) return false;
    const hash = crypto.scryptSync(String(password), parts[0], 64).toString('hex');
    return hash === parts[1];
  } catch (e) {
    return false;
  }
}

function today() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { hashPassword, verifyPassword, today };