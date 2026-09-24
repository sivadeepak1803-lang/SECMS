const express = require('express');
const db = require('../config/db');
const { missingFields, isValidEmail, isIntInRange, cleanStr } = require('../utils/validate');

const router = express.Router();

router.get('/students/next-id', (req, res) => {
  const rows = db.prepare('SELECT student_id FROM students').all();
  let max = 0;
  rows.forEach((r) => {
    const m = String(r.student_id).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  res.json({ student_id: 'STU' + String(max + 1).padStart(4, '0') });
});

router.get('/students', (req, res) => {
  const { search = '', department = '', year = '' } = req.query;
  let sql = `
    SELECT s.*,
           (SELECT COUNT(*) FROM enrollments e
             WHERE e.student_id = s.id AND e.status = 'Enrolled') AS enrolled_courses
    FROM students s
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND (s.name LIKE ? OR s.student_id LIKE ? OR s.email LIKE ? OR s.phone LIKE ?)';
    const w = `%${search}%`;
    params.push(w, w, w, w);
  }
  if (department) {
    sql += ' AND s.department = ?';
    params.push(department);
  }
  if (year) {
    sql += ' AND s.year = ?';
    params.push(Number(year));
  }
  sql += ' ORDER BY s.created_at DESC, s.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/students/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  const enrollments = db
    .prepare(`
      SELECT e.id, e.status, e.enrollment_date, e.cancelled_date,
             c.id AS course_id, c.course_id AS course_code, c.name AS course_name,
             c.department AS course_department, c.credits,
             f.name AS faculty_name
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN faculty f ON f.id = c.faculty_id
      WHERE e.student_id = ?
      ORDER BY e.id DESC
    `)
    .all(req.params.id);

  res.json({ student, enrollments });
});

router.post('/students', (req, res) => {
  const b = req.body || {};
  const miss = missingFields(b, ['student_id', 'name', 'email', 'department', 'year']);
  if (miss.length) {
    return res.status(400).json({ error: `Missing required fields: ${miss.join(', ')}.` });
  }
  if (!isValidEmail(b.email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (!isIntInRange(b.year, 1, 6)) {
    return res.status(400).json({ error: 'Year must be a number between 1 and 6.' });
  }

  const studentId = cleanStr(b.student_id).toUpperCase();
  const name = cleanStr(b.name);
  const email = cleanStr(b.email).toLowerCase();

  if (db.prepare('SELECT id FROM students WHERE student_id = ?').get(studentId)) {
    return res.status(409).json({ error: 'Student ID already exists.' });
  }
  if (db.prepare('SELECT id FROM students WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Email is already registered.' });
  }

  const info = db
    .prepare(
      'INSERT INTO students (student_id, name, email, phone, department, year) VALUES (?,?,?,?,?,?)'
    )
    .run(studentId, name, email, cleanStr(b.phone), cleanStr(b.department), Number(b.year));

  res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Student added successfully.' });
});

router.put('/students/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  const b = req.body || {};
  const miss = missingFields(b, ['student_id', 'name', 'email', 'department', 'year']);
  if (miss.length) {
    return res.status(400).json({ error: `Missing required fields: ${miss.join(', ')}.` });
  }
  if (!isValidEmail(b.email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (!isIntInRange(b.year, 1, 6)) {
    return res.status(400).json({ error: 'Year must be a number between 1 and 6.' });
  }

  const studentId = cleanStr(b.student_id).toUpperCase();
  const name = cleanStr(b.name);
  const email = cleanStr(b.email).toLowerCase();

  const dupId = db.prepare('SELECT id FROM students WHERE student_id = ? AND id != ?').get(studentId, student.id);
  if (dupId) return res.status(409).json({ error: 'Student ID already exists.' });
  const dupEmail = db.prepare('SELECT id FROM students WHERE email = ? AND id != ?').get(email, student.id);
  if (dupEmail) return res.status(409).json({ error: 'Email is already registered.' });

  db.prepare(
    'UPDATE students SET student_id = ?, name = ?, email = ?, phone = ?, department = ?, year = ? WHERE id = ?'
  ).run(studentId, name, email, cleanStr(b.phone), cleanStr(b.department), Number(b.year), student.id);

  res.json({ success: true, message: 'Student updated successfully.' });
});

router.delete('/students/:id', (req, res) => {
  const student = db.prepare('SELECT id FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  db.prepare('DELETE FROM students WHERE id = ?').run(student.id);
  res.json({ success: true, message: 'Student deleted. Their enrollments were removed too.' });
});

module.exports = router;