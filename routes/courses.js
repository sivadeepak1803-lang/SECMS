const express = require('express');
const db = require('../config/db');
const { missingFields, isIntInRange, cleanStr } = require('../utils/validate');

const router = express.Router();

router.get('/courses/next-id', (req, res) => {
  const rows = db.prepare('SELECT course_id FROM courses').all();
  let max = 0;
  rows.forEach((r) => {
    const m = String(r.course_id).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  res.json({ course_id: 'CSE' + String(max + 1).padStart(3, '0') });
});

router.get('/courses', (req, res) => {
  const { search = '', department = '', faculty_id = '' } = req.query;
  let sql = `
    SELECT c.*,
           f.name AS faculty_name,
           f.faculty_id AS faculty_code,
           (SELECT COUNT(*) FROM enrollments e
             WHERE e.course_id = c.id AND e.status = 'Enrolled') AS enrolled_count
    FROM courses c
    LEFT JOIN faculty f ON f.id = c.faculty_id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND (c.name LIKE ? OR c.course_id LIKE ? OR c.department LIKE ? OR f.name LIKE ?)';
    const w = `%${search}%`;
    params.push(w, w, w, w);
  }
  if (department) {
    sql += ' AND c.department = ?';
    params.push(department);
  }
  if (faculty_id) {
    sql += ' AND c.faculty_id = ?';
    params.push(Number(faculty_id));
  }
  sql += ' ORDER BY c.created_at DESC, c.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/courses/:id', (req, res) => {
  const course = db
    .prepare(`
      SELECT c.*, f.name AS faculty_name, f.faculty_id AS faculty_code
      FROM courses c
      LEFT JOIN faculty f ON f.id = c.faculty_id
      WHERE c.id = ?
    `)
    .get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const enrollments = db
    .prepare(`
      SELECT e.id, e.status, e.enrollment_date, e.cancelled_date,
             s.id AS student_id, s.student_id AS student_code, s.name AS student_name,
             s.email AS student_email, s.department AS student_department, s.year AS student_year
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE e.course_id = ?
      ORDER BY e.id DESC
    `)
    .all(req.params.id);

  res.json({ course, enrollments });
});

router.post('/courses', (req, res) => {
  const b = req.body || {};
  const miss = missingFields(b, ['course_id', 'name', 'department', 'credits', 'seats']);
  if (miss.length) {
    return res.status(400).json({ error: `Missing required fields: ${miss.join(', ')}.` });
  }
  if (!isIntInRange(b.credits, 1, 6)) {
    return res.status(400).json({ error: 'Credits must be a number between 1 and 6.' });
  }
  if (!isIntInRange(b.seats, 0, 1000)) {
    return res.status(400).json({ error: 'Seats must be a number between 0 and 1000.' });
  }

  const courseId = cleanStr(b.course_id).toUpperCase();
  const name = cleanStr(b.name);
  if (db.prepare('SELECT id FROM courses WHERE course_id = ?').get(courseId)) {
    return res.status(409).json({ error: 'Course ID already exists.' });
  }
  if (db.prepare('SELECT id FROM courses WHERE name = ?').get(name)) {
    return res.status(409).json({ error: 'A course with this name already exists.' });
  }

  const facultyId = b.faculty_id ? Number(b.faculty_id) : null;
  if (facultyId && !db.prepare('SELECT id FROM faculty WHERE id = ?').get(facultyId)) {
    return res.status(400).json({ error: 'Selected faculty does not exist.' });
  }

  const info = db
    .prepare(
      'INSERT INTO courses (course_id, name, department, credits, faculty_id, seats) VALUES (?,?,?,?,?,?)'
    )
    .run(courseId, name, cleanStr(b.department), Number(b.credits), facultyId, Number(b.seats));

  res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Course added successfully.' });
});

router.put('/courses/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const b = req.body || {};
  const miss = missingFields(b, ['course_id', 'name', 'department', 'credits', 'seats']);
  if (miss.length) {
    return res.status(400).json({ error: `Missing required fields: ${miss.join(', ')}.` });
  }
  if (!isIntInRange(b.credits, 1, 6)) {
    return res.status(400).json({ error: 'Credits must be a number between 1 and 6.' });
  }
  if (!isIntInRange(b.seats, 0, 1000)) {
    return res.status(400).json({ error: 'Seats must be a number between 0 and 1000.' });
  }

  const courseId = cleanStr(b.course_id).toUpperCase();
  const name = cleanStr(b.name);
  if (db.prepare('SELECT id FROM courses WHERE course_id = ? AND id != ?').get(courseId, course.id)) {
    return res.status(409).json({ error: 'Course ID already exists.' });
  }
  if (db.prepare('SELECT id FROM courses WHERE name = ? AND id != ?').get(name, course.id)) {
    return res.status(409).json({ error: 'A course with this name already exists.' });
  }

  const facultyId = b.faculty_id ? Number(b.faculty_id) : null;
  if (facultyId && !db.prepare('SELECT id FROM faculty WHERE id = ?').get(facultyId)) {
    return res.status(400).json({ error: 'Selected faculty does not exist.' });
  }

  const enrolled = db
    .prepare("SELECT COUNT(*) AS c FROM enrollments WHERE course_id = ? AND status = 'Enrolled'")
    .get(course.id).c;
  if (Number(b.seats) < 0) {
    return res.status(400).json({ error: 'Seats cannot go below 0.' });
  }

  db.prepare(
    'UPDATE courses SET course_id = ?, name = ?, department = ?, credits = ?, faculty_id = ?, seats = ? WHERE id = ?'
  ).run(courseId, name, cleanStr(b.department), Number(b.credits), facultyId, Number(b.seats), course.id);

  res.json({ success: true, message: 'Course updated successfully.' });
});

router.delete('/courses/:id', (req, res) => {
  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  db.prepare('DELETE FROM courses WHERE id = ?').run(course.id);
  res.json({ success: true, message: 'Course deleted. Its enrollments were removed too.' });
});

module.exports = router;