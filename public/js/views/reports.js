window.Views = window.Views || {};

Views.reports = {
  render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Reports</h2>
          <p class="sub">Analytics and statistics across the college.</p>
        </div>
        <div class="page-actions report-actions">
          <button class="btn btn-cyan" onclick="window.print()">
            ${ICONS.printer} Print Report
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="card stat-card">
          <div class="stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div><div class="stat-value" id="repStudents">—</div><div class="stat-label">Total Students</div></div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/></svg></div>
          <div><div class="stat-value" id="repCourses">—</div><div class="stat-label">Total Courses</div></div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <div><div class="stat-value" id="repFaculty">—</div><div class="stat-label">Total Faculty</div></div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v14H4z"/><path d="M4 9h16"/></svg></div>
          <div><div class="stat-value" id="repActive">—</div><div class="stat-label">Active Enrollments</div></div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="card chart-card">
          <h3>Students by Department</h3>
          <p class="sub">Distribution of students across departments</p>
          <div class="bar-chart" id="deptStudentsChart"><div class="bar-row"><div class="bar-track"><div class="bar-fill"></div></div></div></div>
        </div>

        <div class="card chart-card">
          <h3>Courses by Department</h3>
          <p class="sub">Course catalog spread across departments</p>
          <div class="bar-chart" id="deptCoursesChart"><div class="bar-row"><div class="bar-track"><div class="bar-fill cyan"></div></div></div></div>
        </div>

        <div class="card chart-card">
          <h3>Students by Year</h3>
          <p class="sub">Year-wise student strength</p>
          <div class="bar-chart" id="yearStudentsChart"><div class="bar-row"><div class="bar-track"><div class="bar-fill amber"></div></div></div></div>
        </div>

        <div class="card chart-card">
          <h3>Enrollment Health</h3>
          <p class="sub">Active vs cancelled enrollments</p>
          <div class="status-breakdown" id="statusBreakdown"></div>
          <div class="status-legend" id="statusLegend"></div>
          <div class="detail-section"><h4>Occupancy rate</h4>
            <div class="bar-track" style="height:18px"><div class="bar-fill green" id="occupancyFill" style="width:0"></div></div>
            <div style="margin-top:8px;font-size:13px;color:var(--muted)"><strong id="occupancyVal" style="color:var(--text)">0%</strong> of total course seats filled by active enrollments</div>
          </div>
        </div>
      </div>

      <div class="card table-card">
        <div class="table-head">
          <h3>Course-wise Enrollment Report</h3>
          <div class="right"><span class="count-chip" id="crsRepCount">0 rows</span></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Course</th><th>Department</th><th>Credits</th>
                <th>Active</th><th>Cancelled</th><th>Seats Left</th><th>Occupancy</th>
              </tr>
            </thead>
            <tbody id="crsRepBody">
              <tr><td colspan="7" class="empty-state"><p>Loading report…</p></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.load();
  },

  renderBars(elId, data, max) {
    const maxVal = max || Math.max(1, ...data.map((d) => d.value));
    const el = document.getElementById(elId);
    if (!el) return;
    if (!data.length) {
      el.innerHTML = '<div class="empty-state"><p>No data available.</p></div>';
      return;
    }
    el.innerHTML = data
      .map((d) => `
        <div class="bar-row">
          <div class="bar-label" title="${escapeHtml(String(d.label))}">${escapeHtml(String(d.label))}</div>
          <div class="bar-track"><div class="bar-fill" data-width="${Math.round((d.value / maxVal) * 100)}"></div></div>
          <div class="bar-val">${d.value}</div>
        </div>`)
      .join('');
  },

  renderCourseTable(rows) {
    const body = document.getElementById('crsRepBody');
    document.getElementById('crsRepCount').textContent = `${rows.length} rows`;
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7" class="empty-state"><p>No courses found.</p></td></tr>`;
      return;
    }
    body.innerHTML = rows
      .map(
        (r) => `
        <tr>
          <td><strong>${escapeHtml(r.name)}</strong><br><span class="mono">${escapeHtml(r.code)}</span></td>
          <td class="muted">${escapeHtml(r.department)}</td>
          <td><span class="badge count plain info">${r.credits} cr</span></td>
          <td><span class="badge count plain success">${r.enrolled}</span></td>
          <td><span class="badge count plain ${r.cancelled ? 'danger' : 'muted'}">${r.cancelled}</span></td>
          <td><span class="badge count plain ${r.available_seats <= 5 ? 'warn' : 'muted'}">${r.available_seats}</span></td>
          <td>
            <div style="display:flex;align-items:center;gap:10px;min-width:130px">
              <div class="bar-track" style="flex:1"><div class="bar-fill" data-width="${r.occupancy}" style="${r.occupancy > 0 ? '' : 'display:none'}"></div></div>
              <span style="font-weight:700;font-size:13px;width:38px;text-align:right">${r.occupancy}%</span>
            </div>
          </td>
        </tr>`
      )
      .join('');
  },

  renderStatusBreakdown(list, active, cancelled) {
    const total = active + cancelled || 1;
    const el = document.getElementById('statusBreakdown');
    el.innerHTML = list
      .map((s) => `<div class="status-seg ${s.color}" style="flex:${(s.value / total) * 100}"></div>`)
      .join('');
    document.getElementById('statusLegend').innerHTML = list
      .map((s) => `<span><i class="dot-${s.color}"></i>${escapeHtml(s.label)}: <strong style="color:var(--text)">${s.value}</strong></span>`)
      .join('');
  },

  async load() {
    try {
      const data = await api('/reports');

      document.getElementById('repStudents').textContent = data.statistics.students;
      document.getElementById('repCourses').textContent = data.statistics.courses;
      document.getElementById('repFaculty').textContent = data.statistics.faculty;
      document.getElementById('repActive').textContent = data.statistics.active;

      this.renderBars('deptStudentsChart', data.departmentStudents, null);
      this.renderBars('deptCoursesChart', data.departmentCourses, null);
      this.renderBars('yearStudentsChart', data.yearStudents, null);
      this.renderCourseTable(data.courseEnrollments);
      this.renderStatusBreakdown(data.statusBreakdown, data.statistics.active, data.statistics.cancelled);

      requestAnimationFrame(() => {
        document.querySelectorAll('.bar-fill[data-width]').forEach((b) => {
          b.style.width = b.dataset.width + '%';
        });
        const occ = document.getElementById('occupancyFill');
        if (occ) occ.style.width = data.statistics.enrollmentRate + '%';
        const occVal = document.getElementById('occupancyVal');
        if (occVal) occVal.textContent = data.statistics.enrollmentRate + '%';
      });
    } catch (e) {
      document.querySelectorAll('.chart-card .bar-chart, #crsRepBody').forEach((el) => {
        el.innerHTML = `<div class="empty-state"><p>${escapeHtml(e.message)}</p></div>`;
      });
    }
  },
};