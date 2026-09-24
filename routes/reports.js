const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/reports', (req, res) => {
  const statistics = {
    students: db.prepare('SELECT COUNT(*) AS c FROM students').get().c,
    courses: db.prepare('SELECT COUNT(*) AS c FROM courses').get().c,
    faculty: db.prepare('SELECT COUNT(*) AS c FROM faculty').get().c,
    active: db.prepare("SELECT COUNT(*) AS c FROM enrollments WHERE status = 'Enrolled'").get().c,
    cancelled: db.prepare("SELECT COUNT(*) AS c FROM enrollments WHERE status = 'Cancelled'").get().c,
    totalSeats: db.prepare('SELECT COALESCE(SUM(seats), 0) AS c FROM courses').get().c,
  };
  statistics.enrollmentRate =
    statistics.totalSeats > 0 ? Math.round((statistics.active / (statistics.active + statistics.totalSeats)) * 100) : 0;

  const departmentStudents = db
    .prepare('SELECT department AS label, COUNT(*) AS value FROM students GROUP BY department ORDER BY value DESC, label')
    .all();

  const departmentCourses = db
    .prepare('SELECT department AS label, COUNT(*) AS value FROM courses GROUP BY department ORDER BY value DESC, label')
    .all();

  const yearStudents = db
    .prepare('SELECT year AS label, COUNT(*) AS value FROM students GROUP BY year ORDER BY year')
    .all();

  const courseEnrollments = db
    .prepare(`
      SELECT c.id, c.course_id AS code, c.name, c.department, c.credits, c.seats AS available_seats,
             (SELECT COUNT(*) FROM enrollments e
               WHERE e.course_id = c.id AND e.status = 'Enrolled')  AS enrolled,
             (SELECT COUNT(*) FROM enrollments e
               WHERE e.course_id = c.id AND e.status = 'Cancelled') AS cancelled
      FROM courses c
      ORDER BY enrolled DESC, c.name
    `)
    .all()
    .map((r) => ({
      ...r,
      capacity: r.enrolled + r.available_seats,
      occupancy: r.enrolled + r.available_seats > 0
        ? Math.round((r.enrolled / (r.enrolled + r.available_seats)) * 100)
        : 0,
    }));

  const statusBreakdown = [
    { label: 'Active Enrollments', value: statistics.active, color: 'enrolled' },
    { label: 'Cancelled Enrollments', value: statistics.cancelled, color: 'cancelled' },
  ];

  res.json({ statistics, departmentStudents, departmentCourses, yearStudents, courseEnrollments, statusBreakdown });
});

module.exports = router;