const express = require('express');
const db = require('../config/db');
const { missingFields, isValidEmail, cleanStr } = require('../utils/validate');

const router = express.Router();

router.get('/faculty', (req, res) => {
  const { search = '', department = '' } = req.query;
  let sql = `
    SELECT f.*,
           (SELECT COUNT(*) FROM courses c WHERE c.faculty_id = f.id) AS assigned_courses
    FROM faculty f
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND (f.name LIKE ? OR f.faculty_id LIKE ? OR f.email LIKE ? OR f.phone LIKE ?)';
    const w = `%${search}%`;
    params.push(w, w, w, w);
  }
  if (department) {
    sql += ' AND f.department = ?';
    params.push(department);
  }
  sql += ' ORDER BY f.created_at DESC, f.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/faculty/:id', (req, res) => {
  const member = db.prepare('SELECT * FROM faculty WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Faculty member not found.' });

  const courses = db
    .prepare(`
      SELECT c.id, c.course_id, c.name, c.department, c.credits, c.seats,
             (SELECT COUNT(*) FROM enrollments e
               WHERE e.course_id = c.id AND e.status = 'Enrolled') AS enrolled_count
      FROM courses c
      WHERE c.faculty_id = ?
      ORDER BY c.name
    `)
    .all(req.params.id);

  const unassigned = db
    .prepare('SELECT id, course_id, name, department FROM courses WHERE faculty_id IS NULL OR faculty_id = ? ORDER BY name')
    .all(req.params.id);

  res.json({ faculty: member, courses, unassigned });
});

router.post('/faculty', (req, res) => {
  const b = req.body || {};
  const miss = missingFields(b, ['faculty_id', 'name', 'email', 'department']);
  if (miss.length) {
    return res.status(400).json({ error: `Missing required fields: ${miss.join(', ')}.` });
  }
  if (!isValidEmail(b.email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const facultyId = cleanStr(b.faculty_id).toUpperCase();
  const name = cleanStr(b.name);
  const email = cleanStr(b.email).toLowerCase();

  if (db.prepare('SELECT id FROM faculty WHERE faculty_id = ?').get(facultyId)) {
    return res.status(409).json({ error: 'Faculty ID already exists.' });
  }
  if (db.prepare('SELECT id FROM faculty WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Email is already registered.' });
  }

  const info = db
    .prepare(
      'INSERT INTO faculty (faculty_id, name, email, phone, department, designation) VALUES (?,?,?,?,?,?)'
    )
    .run(facultyId, name, email, cleanStr(b.phone), cleanStr(b.department), cleanStr(b.designation, 'Assistant Professor'));

  res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Faculty member added successfully.' });
});

router.put('/faculty/:id', (req, res) => {
  const member = db.prepare('SELECT * FROM faculty WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Faculty member not found.' });

  const b = req.body || {};
  const miss = missingFields(b, ['faculty_id', 'name', 'email', 'department']);
  if (miss.length) {
    return res.status(400).json({ error: `Missing required fields: ${miss.join(', ')}.` });
  }
  if (!isValidEmail(b.email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const facultyId = cleanStr(b.faculty_id).toUpperCase();
  const name = cleanStr(b.name);
  const email = cleanStr(b.email).toLowerCase();

  if (db.prepare('SELECT id FROM faculty WHERE faculty_id = ? AND id != ?').get(facultyId, member.id)) {
    return res.status(409).json({ error: 'Faculty ID already exists.' });
  }
  if (db.prepare('SELECT id FROM faculty WHERE email = ? AND id != ?').get(email, member.id)) {
    return res.status(409).json({ error: 'Email is already registered.' });
  }

  db.prepare(
    'UPDATE faculty SET faculty_id = ?, name = ?, email = ?, phone = ?, department = ?, designation = ? WHERE id = ?'
  ).run(
    facultyId,
    name,
    email,
    cleanStr(b.phone),
    cleanStr(b.department),
    cleanStr(b.designation, member.designation),
    member.id
  );

  res.json({ success: true, message: 'Faculty member updated successfully.' });
});

router.delete('/faculty/:id', (req, res) => {
  const member = db.prepare('SELECT id FROM faculty WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Faculty member not found.' });

  const tx = db.transaction(() => {
    db.prepare('UPDATE courses SET faculty_id = NULL WHERE faculty_id = ?').run(member.id);
    db.prepare('DELETE FROM faculty WHERE id = ?').run(member.id);
  });
  tx();

  res.json({ success: true, message: 'Faculty member deleted. Courses were unassigned.' });
});

router.post('/faculty/:id/assign-course', (req, res) => {
  const member = db.prepare('SELECT * FROM faculty WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Faculty member not found.' });

  const courseId = Number((req.body || {}).courseId);
  if (!courseId) return res.status(400).json({ error: 'Select a course to assign.' });

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  if (course.faculty_id === member.id) {
    return res.status(409).json({ error: `This course is already assigned to ${member.name}.` });
  }
  if (course.faculty_id) {
    const other = db.prepare('SELECT name FROM faculty WHERE id = ?').get(course.faculty_id);
    if (other) {
      return res.status(409).json({ error: `Course is already assigned to ${other.name}. Unassign it first.` });
    }
  }

  db.prepare('UPDATE courses SET faculty_id = ? WHERE id = ?').run(member.id, course.id);
  res.json({ success: true, message: `Course assigned to ${member.name}.` });
});

module.exports = router;