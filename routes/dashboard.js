const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/dashboard/stats', (req, res) => {
  const totals = {
    students: db.prepare('SELECT COUNT(*) AS c FROM students').get().c,
    courses: db.prepare('SELECT COUNT(*) AS c FROM courses').get().c,
    faculty: db.prepare('SELECT COUNT(*) AS c FROM faculty').get().c,
    enrollments: db.prepare("SELECT COUNT(*) AS c FROM enrollments WHERE status = 'Enrolled'").get().c,
    totalSeats: db.prepare('SELECT COALESCE(SUM(seats), 0) AS c FROM courses').get().c,
    cancelled: db.prepare("SELECT COUNT(*) AS c FROM enrollments WHERE status = 'Cancelled'").get().c,
  };

  const recent = db
    .prepare(`
      SELECT e.id, e.enrollment_date, e.status,
             s.id AS student_id, s.name AS student_name, s.student_id AS student_code,
             c.id AS course_id, c.name AS course_name, c.course_id AS course_code
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN courses c  ON c.id = e.course_id
      ORDER BY e.id DESC
      LIMIT 8
    `)
    .all();

  res.json({ totals, recent });
});

module.exports = router;