const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function missingFields(body, fields) {
  const b = body || {};
  return fields.filter((f) => b[f] === undefined || String(b[f]).trim() === '');
}

function isValidEmail(email) {
  return EMAIL_RE.test(String(email || '').trim());
}

function isIntInRange(value, min, max) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
}

function cleanStr(value, fallback = '') {
  return value === undefined || value === null ? fallback : String(value).trim();
}

module.exports = { missingFields, isValidEmail, isIntInRange, cleanStr };