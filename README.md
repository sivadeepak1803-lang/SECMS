# SECMS - Student Enrollment & Course Management System

A professional, modern college management web application where an administrator can manage **students, courses, faculty, and student enrollments** all in one place. Built with a beginner-friendly Node.js stack.

![Stack](https://img.shields.io/badge/Stack-Node.js%20%2B%20Express%20%2B%20SQLite-3b82f6)

## Features

- **Admin Login** - secure session-based authentication with password hashing (scrypt)
- **Dashboard** - total students, courses, faculty, enrollments, recent enrollments and quick actions
- **Student Management** - add, edit, delete, view details, search & filter (ID, Name, Email, Phone, Department, Year)
- **Course Management** - add, edit, delete, view details, search & filter (ID, Name, Department, Credits, Faculty, Seats)
- **Faculty Management** - add, edit, delete, view, and assign faculty to courses
- **Enrollment Management** - enroll students, prevent duplicates, check seats, cancel, and view history
- **Reports** - department-wise students, course-wise enrollment, year-wise strength, enrollment statistics (printable)
- **Settings** - update admin profile and change password

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | HTML, CSS, JavaScript (Vanilla)     |
| Backend   | Node.js + Express.js                |
| Database  | SQLite (via `better-sqlite3`)       |
| Auth      | Express Sessions + scrypt hashing   |

## Getting Started (VS Code)

### Prerequisites

- [Node.js](https://nodejs.org) **v18 or newer** (LTS recommended)
- [VS Code](https://code.visualstudio.com)
- Optional: VS Code extension **"SQLite Viewer"** to inspect `data/college.db`

### 1. Install dependencies

Open the project folder in VS Code, open a new terminal (`Ctrl + ~`) and run:

```bash
npm install
```

### 2. Start the server

```bash
npm start
```

You should see:

```
SECMS - Student Enrollment & Course Management
Running on http://localhost:3000
```

### 3. Open the app

Visit **http://localhost:3000** in your browser and login:

```
Username: admin
Password: admin123
```

> Change the default password in **Settings** after first login.

### Optional: Load sample data

To see the app populated with demo students, courses, faculty and enrollments:

```bash
npm run seed
```

Run this only once - it skips if the database already has data.

### Development mode (auto-restart)

```bash
npm run dev
```

Uses `nodemon` to restart the server whenever you edit a file.

## Project Structure

```
SECMS PROJECT/
├── package.json
├── server.js               # Express server entry point (port 3000)
├── config/
│   └── db.js               # SQLite connection + schema + default admin
├── middleware/
│   └── auth.js             # Session guard for protected APIs
├── utils/
│   ├── helpers.js          # Password hashing / verify
│   └── validate.js         # Input validation helpers
├── routes/                 # REST API routes
│   ├── auth.js
│   ├── dashboard.js
│   ├── students.js
│   ├── courses.js
│   ├── faculty.js
│   ├── enrollments.js
│   ├── reports.js
│   └── settings.js
├── scripts/
│   └── seed.js             # Optional sample data
├── data/                   # SQLite database lives here (created automatically)
│   └── college.db
└── public/                 # Frontend (static files)
    ├── login.html
    ├── app.html            # SPA shell (sidebar + views)
    ├── css/style.css       # Dark navy glassmorphism theme
    └── js/
        ├── helpers.js
        ├── toast.js
        ├── api.js
        ├── login.js
        ├── app.js
        └── views/          # One module per page
            ├── dashboard.js
            ├── students.js
            ├── courses.js
            ├── faculty.js
            ├── enrollments.js
            ├── reports.js
            └── settings.js
```

## Database Schema

```
admins      (id, username, password_hash, name, email)
students    (id, student_id UNIQUE, name, email UNIQUE, phone, department, year)
faculty     (id, faculty_id UNIQUE, name, email UNIQUE, phone, department, designation)
courses     (id, course_id UNIQUE, name, department, credits, faculty_id -> faculty.id, seats)
enrollments (id, student_id -> students.id, course_id -> courses.id, status, enrollment_date,
             cancelled_date, UNIQUE(student_id, course_id))
```

- Deleting a student/faculty/course automatically cleans up relationships (ON DELETE CASCADE / SET NULL).
- A duplicate enrollment for the same student + course is rejected.
- Enrolling decrements course seats; cancelling returns the seat.

## API Overview

| Method | Endpoint                       | Purpose                          |
|--------|--------------------------------|----------------------------------|
| POST   | `/api/auth/login`              | Login (session)                  |
| POST   | `/api/auth/logout`             | Logout                           |
| GET    | `/api/auth/me`                 | Current admin                    |
| GET    | `/api/dashboard/stats`         | Dashboard totals + recent        |
| GET    | `/api/students`                | List students (search/filter)    |
| POST   | `/api/students`                | Add student                      |
| GET    | `/api/students/:id`            | Student + enrollment history     |
| PUT    | `/api/students/:id`            | Update student                   |
| DELETE | `/api/students/:id`            | Delete student                   |
| GET    | `/api/courses`                 | List courses (search/filter)     |
| POST   | `/api/courses`                 | Add course                       |
| PUT    | `/api/courses/:id`             | Update course                    |
| DELETE | `/api/courses/:id`             | Delete course                    |
| GET    | `/api/faculty`                 | List faculty                     |
| POST   | `/api/faculty`                 | Add faculty                      |
| POST   | `/api/faculty/:id/assign-course`| Assign a course to faculty      |
| GET    | `/api/enrollments`             | List enrollments                 |
| GET    | `/api/enrollments/options`     | Students & courses for dropdowns |
| POST   | `/api/enrollments`             | Enroll student (validated)       |
| DELETE | `/api/enrollments/:id`         | Cancel enrollment                |
| GET    | `/api/reports`                 | All report data                  |
| PUT    | `/api/settings/profile`        | Update admin profile             |
| PUT    | `/api/settings/password`       | Change password                  |

## Troubleshooting

- **`better-sqlite3` install error** - use the Node.js LTS version (18 or 20 recommended) and re-run `npm install`.
- **Port 3000 in use** - stop the other process, or run `set PORT=3001 && npm start` (Windows PowerShell: `$env:PORT=3001; npm start`).
- **Forget the admin password** - delete `data/college.db` and restart the server to recreate the default `admin / admin123` login.