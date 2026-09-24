const express = require('express');
const db = require('../config/db');
const { isIntInRange, cleanStr } = require('../utils/validate');
const { today } = require('../utils/helpers');

const router = express.Router();

router.get('/enrollments/options', (req, res) => {
  const students = db
    .prepare('SELECT id, student_id, name, department, year FROM students ORDER BY name')
    .all();
  const courses = db
    .prepare('SELECT id, course_id, name, department, credits, seats FROM courses ORDER BY name')
    .all();
  res.json({ students, courses });
});

router.get('/enrollments', (req, res) => {
  const { search = '', status = '' } = req.query;
  let sql = `
    SELECT e.id, e.status, e.enrollment_date, e.cancelled_date, e.student_id, e.course_id,
           s.name AS student_name, s.student_id AS student_code, s.department AS student_dept,
           c.name AS course_name, c.course_id AS course_code, c.department AS course_dept,
           f.name AS faculty_name
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    JOIN courses c  ON c.id = e.course_id
    LEFT JOIN faculty f ON f.id = c.faculty_id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    sql += ' AND e.status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (s.name LIKE ? OR s.student_id LIKE ? OR c.name LIKE ? OR c.course_id LIKE ? OR f.name LIKE ?)';
    const w = `%${search}%`;
    params.push(w, w, w, w, w);
  }
  sql += ' ORDER BY e.id DESC LIMIT 500';
  res.json(db.prepare(sql).all(...params));
});

router.post('/enrollments', (req, res) => {
  const b = req.body || {};
  if (!isIntInRange(b.studentId, 1, 1e9)) {
    return res.status(400).json({ error: 'Please select a valid student.' });
  }
  if (!isIntInRange(b.courseId, 1, 1e9)) {
    return res.status(400).json({ error: 'Please select a valid course.' });
  }

  const student = db.prepare('SELECT id, student_id, name FROM students WHERE id = ?').get(b.studentId);
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  const course = db.prepare('SELECT id, course_id, name, seats FROM courses WHERE id = ?').get(b.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const existing = db
    .prepare('SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ?')
    .get(student.id, course.id);

  const enroll = db.transaction(() => {
    if (existing && existing.status === 'Enrolled') {
      return { error: `${student.name} is already enrolled in ${course.name}.` };
    }
    if (course.seats <= 0) {
      return { error: `No seats available in ${course.name}.` };
    }

    const now = today();
    if (existing) {
      db.prepare(
        "UPDATE enrollments SET status = 'Enrolled', enrollment_date = ?, cancelled_date = NULL WHERE id = ?"
      ).run(now, existing.id);
    } else {
      db.prepare(
        "INSERT INTO enrollments (student_id, course_id, status, enrollment_date) VALUES (?,?, 'Enrolled', ?)"
      ).run(student.id, course.id, now);
    }
    db.prepare('UPDATE courses SET seats = seats - 1 WHERE id = ?').run(course.id);
    return null;
  });

  const problem = enroll();
  if (problem) {
    const text = problem.error || problem.message || '';
    const code = text.includes('already enrolled') ? 409 : 400;
    return res.status(code).json({ error: problem.error });
  }

  res.status(201).json({ success: true, message: `${student.name} enrolled in ${course.name}.` });
});

router.delete('/enrollments/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM enrollments WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Enrollment record not found.' });

  if (row.status === 'Cancelled') {
    return res.json({ success: true, message: 'This enrollment was already cancelled.' });
  }

  const cancel = db.transaction(() => {
    db.prepare(
      "UPDATE enrollments SET status = 'Cancelled', cancelled_date = ? WHERE id = ?"
    ).run(today(), row.id);
    db.prepare('UPDATE courses SET seats = seats + 1 WHERE id = ?').run(row.course_id);
  });
  cancel();

  res.json({ success: true, message: 'Enrollment cancelled. Seat released back to the course.' });
});

module.exports = router;