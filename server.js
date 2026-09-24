const express = require('express');
const session = require('express-session');
const path = require('path');

const { initDb } = require('./config/db');
const requireAuth = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const studentsRoutes = require('./routes/students');
const coursesRoutes = require('./routes/courses');
const facultyRoutes = require('./routes/faculty');
const enrollmentsRoutes = require('./routes/enrollments');
const reportsRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secms-change-this-secret-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
  })
);

app.use(express.static(path.join(__dirname, 'public')));

initDb();

app.use('/api/auth', authRoutes);
app.use('/api', requireAuth, dashboardRoutes);
app.use('/api', requireAuth, studentsRoutes);
app.use('/api', requireAuth, coursesRoutes);
app.use('/api', requireAuth, facultyRoutes);
app.use('/api', requireAuth, enrollmentsRoutes);
app.use('/api', requireAuth, reportsRoutes);
app.use('/api', requireAuth, settingsRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

app.get('*', (req, res) => res.redirect('/'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('SECMS Server Started Successfully!');
  console.log(`Local: http://localhost:${PORT}`);
  console.log('Host: http://127.0.0.1:3000');
});