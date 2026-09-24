window.Views = window.Views || {};

Views.dashboard = {
  render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Dashboard</h2>
          <p class="sub">Welcome back! Here is what is happening across the college.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-cyan" onclick="Views.dashboard.openEnrollment()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            New Enrollment
          </button>
          <button class="btn btn-primary" onclick="Views.students.openForm()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Add Student
          </button>
          <button class="btn btn-ghost" onclick="Views.courses.openForm()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Add Course
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="card stat-card" onclick="navigate('students')">
          <div class="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
          </div>
          <div><div class="stat-value" id="statStudents">—</div><div class="stat-label">Total Students</div></div>
        </div>
        <div class="card stat-card" onclick="navigate('courses')">
          <div class="stat-icon cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <div><div class="stat-value" id="statCourses">—</div><div class="stat-label">Total Courses</div></div>
        </div>
        <div class="card stat-card" onclick="navigate('faculty')">
          <div class="stat-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 3l2 2-2 2-2-2z"/></svg>
          </div>
          <div><div class="stat-value" id="statFaculty">—</div><div class="stat-label">Total Faculty</div></div>
        </div>
        <div class="card stat-card" onclick="navigate('enrollments')">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v14H4z"/><path d="M4 9h16"/><path d="M8 13h4"/></svg>
          </div>
          <div><div class="stat-value" id="statEnroll">—</div><div class="stat-label">Active Enrollments</div></div>
        </div>
      </div>

      <div class="card table-card">
        <div class="table-head">
          <h3>Recent Enrollments</h3>
          <div class="right">
            <span class="count-chip" id="recentCount">0 records</span>
            <button class="btn btn-ghost icon-btn-sm" style="padding:0 6px" onclick="navigate('enrollments')" title="View all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
            </button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Student</th><th>Course</th><th>Enrolled On</th><th class="th-actions">Status</th></tr>
            </thead>
            <tbody id="recentBody">
              <tr><td colspan="4" class="empty-state"><p>Loading recent enrollments…</p></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.load();
  },

  async load() {
    try {
      const data = await api('/dashboard/stats');
      document.getElementById('statStudents').textContent = data.totals.students;
      document.getElementById('statCourses').textContent = data.totals.courses;
      document.getElementById('statFaculty').textContent = data.totals.faculty;
      document.getElementById('statEnroll').textContent = data.totals.enrollments;

      const body = document.getElementById('recentBody');
      document.getElementById('recentCount').textContent = `${data.recent.length} records`;

      if (!data.recent.length) {
        body.innerHTML = `<tr><td colspan="4" class="empty-state">
          ${ICONS.empty}<h4>No enrollments yet</h4>
          <p>Use "New Enrollment" to enroll a student into a course.</p></td></tr>`;
        return;
      }

      body.innerHTML = data.recent
        .map(
          (r) => `
          <tr>
            <td><div class="cell-person"><div class="avatar-sm">${escapeHtml(initials(r.student_name))}</div>
              <div><strong>${escapeHtml(r.student_name)}</strong><small>${escapeHtml(r.student_code)}</small></div></div></td>
            <td><strong>${escapeHtml(r.course_name)}</strong><br><span class="mono">${escapeHtml(r.course_code)}</span></td>
            <td class="muted">${escapeHtml(formatDate(r.enrollment_date))}</td>
            <td class="td-actions">${statusBadge(r.status)}</td>
          </tr>`
        )
        .join('');
    } catch (e) {
      document.getElementById('recentBody').innerHTML =
        `<tr><td colspan="4" class="empty-state"><p>${escapeHtml(e.message)}</p></td></tr>`;
    }
  },

  openEnrollment() {
    Views.enrollments.openForm();
  },
};