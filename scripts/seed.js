const { initDb } = require('../config/db');
const db = require('../config/db');

initDb();

const studentsCount = db.prepare('SELECT COUNT(*) AS c FROM students').get().c;
if (studentsCount > 0) {
  console.log('[seed] Database already contains data. Skipping.');
  process.exit(0);
}

const tx = db.transaction(() => {
  db.prepare(`INSERT INTO students (student_id, name, email, phone, department, year) VALUES
    ('STU0001', 'Aarav Sharma', 'aarav.sharma@college.edu', '+91 98100 10001', 'Computer Science', 1),
    ('STU0002', 'Meera Nair', 'meera.nair@college.edu', '+91 98100 10002', 'Information Technology', 1),
    ('STU0003', 'Rohan Gupta', 'rohan.gupta@college.edu', '+91 98100 10003', 'Computer Science', 2),
    ('STU0004', 'Priya Patel', 'priya.patel@college.edu', '+91 98100 10004', 'Electronics & Communication', 2),
    ('STU0005', 'Karan Singh', 'karan.singh@college.edu', '+91 98100 10005', 'Mechanical Engineering', 3),
    ('STU0006', 'Sneha Reddy', 'sneha.reddy@college.edu', '+91 98100 10006', 'Civil Engineering', 3),
    ('STU0007', 'Vikram Joshi', 'vikram.joshi@college.edu', '+91 98100 10007', 'Business Administration', 4),
    ('STU0008', 'Ananya Iyer', 'ananya.iyer@college.edu', '+91 98100 10008', 'Mathematics', 4),
    ('STU0009', 'Ishaan Verma', 'ishaan.verma@college.edu', '+91 98100 10009', 'Information Technology', 1),
    ('STU0010', 'Divya Menon', 'divya.menon@college.edu', '+91 98100 10010', 'Computer Science', 3)`
  ).run();

  db.prepare(`INSERT INTO faculty (faculty_id, name, email, phone, department, designation) VALUES
    ('FAC001', 'Dr. Rajesh Kumar', 'rajesh.kumar@college.edu', '+91 98200 20001', 'Computer Science', 'Professor'),
    ('FAC002', 'Dr. Smita Desai', 'smita.desai@college.edu', '+91 98200 20002', 'Information Technology', 'Associate Professor'),
    ('FAC003', 'Prof. Amit Chatterjee', 'amit.chatterjee@college.edu', '+91 98200 20003', 'Electronics & Communication', 'Professor'),
    ('FAC004', 'Dr. Neha Kulkarni', 'neha.kulkarni@college.edu', '+91 98200 20004', 'Mechanical Engineering', 'Associate Professor'),
    ('FAC005', 'Prof. Sunil Rao', 'sunil.rao@college.edu', '+91 98200 20005', 'Business Administration', 'Lecturer')`
  ).run();

  const cse = db.prepare(`SELECT id FROM faculty WHERE faculty_id = 'FAC001'`).get().id;
  const it = db.prepare(`SELECT id FROM faculty WHERE faculty_id = 'FAC002'`).get().id;
  const ece = db.prepare(`SELECT id FROM faculty WHERE faculty_id = 'FAC003'`).get().id;

  db.prepare(`INSERT INTO courses (course_id, name, department, credits, faculty_id, seats) VALUES
    ('CSE101', 'Introduction to Programming', 'Computer Science', 4, ${cse}, 40),
    ('CSE201', 'Data Structures & Algorithms', 'Computer Science', 4, ${cse}, 35),
    ('CSE301', 'Database Management Systems', 'Computer Science', 3, ${cse}, 40),
    ('IT102', 'Web Technologies', 'Information Technology', 3, ${it}, 40),
    ('IT203', 'Operating Systems', 'Information Technology', 3, ${it}, 35),
    ('ECE110', 'Digital Electronics', 'Electronics & Communication', 4, ${ece}, 30),
    ('ECE210', 'Analog Circuits', 'Electronics & Communication', 3, ${ece}, 30),
    ('MATH101', 'Discrete Mathematics', 'Mathematics', 4, NULL, 50),
    ('BUS205', 'Principles of Management', 'Business Administration', 3, NULL, 40),
    ('MEC101', 'Engineering Mechanics', 'Mechanical Engineering', 4, NULL, 35)`
  ).run();

  const s1 = db.prepare(`SELECT id FROM students WHERE student_id = 'STU0001'`).get().id;
  const s2 = db.prepare(`SELECT id FROM students WHERE student_id = 'STU0002'`).get().id;
  const s3 = db.prepare(`SELECT id FROM students WHERE student_id = 'STU0003'`).get().id;
  const course1 = db.prepare(`SELECT id FROM courses WHERE course_id = 'CSE101'`).get().id;
  const course2 = db.prepare(`SELECT id FROM courses WHERE course_id = 'CSE201'`).get().id;
  const course3 = db.prepare(`SELECT id FROM courses WHERE course_id = 'IT102'`).get().id;

  db.prepare(`INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, 'Enrolled')`).run(s1, course1);
  db.prepare(`INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, 'Enrolled')`).run(s1, course2);
  db.prepare(`INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, 'Enrolled')`).run(s2, course3);
  db.prepare(`INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, 'Enrolled')`).run(s3, course1);

  db.prepare('UPDATE courses SET seats = seats - 1 WHERE id IN (?, ?, ?, ?)').run(course1, course2, course3, course1);
});

tx();

console.log('[seed] Sample data inserted: 10 students, 5 faculty, 10 courses, 4 enrollments.');
console.log('[seed] Login with admin / admin123 at http://localhost:3000');