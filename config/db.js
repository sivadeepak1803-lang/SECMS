const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { hashPassword } = require('../utils/helpers');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'college.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL DEFAULT '',
      email         TEXT NOT NULL DEFAULT '',
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      phone      TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL,
      year       INTEGER NOT NULL DEFAULT 1 CHECK(year BETWEEN 1 AND 6),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS faculty (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_id  TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      phone       TEXT NOT NULL DEFAULT '',
      department  TEXT NOT NULL,
      designation TEXT NOT NULL DEFAULT 'Assistant Professor',
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id   TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      department  TEXT NOT NULL,
      credits     INTEGER NOT NULL DEFAULT 3 CHECK(credits BETWEEN 1 AND 6),
      faculty_id  INTEGER,
      seats       INTEGER NOT NULL DEFAULT 30 CHECK(seats >= 0),
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id      INTEGER NOT NULL,
      course_id       INTEGER NOT NULL,
      status          TEXT NOT NULL DEFAULT 'Enrolled' CHECK(status IN ('Enrolled','Cancelled')),
      enrollment_date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      cancelled_date  TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE,
      UNIQUE (student_id, course_id)
    );

    CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_course  ON enrollments(course_id);
    CREATE INDEX IF NOT EXISTS idx_courses_faculty     ON courses(faculty_id);
  `);

  seedAdmin();
}

function seedAdmin() {
  const row = db.prepare('SELECT COUNT(*) AS c FROM admins').get();
  if (row.c === 0) {
    db.prepare(
      'INSERT INTO admins (username, password_hash, name, email) VALUES (?, ?, ?, ?)'
    ).run(
      'admin',
      hashPassword('admin123'),
      'System Administrator',
      'admin@college.edu'
    );
    console.log('[db] Default admin created -> username: admin | password: admin123');
  }
}

module.exports = db;
module.exports.initDb = initDb;