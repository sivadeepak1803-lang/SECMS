window.Views = window.Views || {};

Views.enrollments = {
  state: { search: '', status: '' },

  render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Enrollments</h2>
          <p class="sub">Enroll students into courses and track their progress.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="Views.enrollments.openForm()">
            ${ICONS.plus} New Enrollment
          </button>
        </div>
      </div>

      <div class="card toolbar">
        <div class="search-field">
          ${ICONS.search}
          <input type="text" id="enrSearch" placeholder="Search by student, course or faculty…" value="${escapeHtml(this.state.search)}" />
        </div>
        <select class="filter-select" id="enrStatus">
          <option value="">All Statuses</option>
          <option value="Enrolled" ${this.state.status === 'Enrolled' ? 'selected' : ''}>Enrolled</option>
          <option value="Cancelled" ${this.state.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>

      <div class="card table-card">
        <div class="table-head">
          <h3>Enrollment Records</h3>
          <div class="right"><span class="count-chip" id="enrCount">0 records</span></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Student</th><th>Course</th><th>Faculty</th>
                <th>Enrolled On</th><th>Status</th><th class="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody id="enrBody">
              <tr><td colspan="6" class="empty-state"><p>Loading enrollments…</p></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
    this.load();
  },

  bindEvents() {
    const reload = debounce(() => {
      this.state.search = document.getElementById('enrSearch').value.trim();
      this.state.status = document.getElementById('enrStatus').value;
      this.load();
    });
    document.getElementById('enrSearch').addEventListener('input', reload);
    document.getElementById('enrStatus').addEventListener('change', reload);
  },

  query() {
    const p = new URLSearchParams();
    if (this.state.search) p.set('search', this.state.search);
    if (this.state.status) p.set('status', this.state.status);
    return p.toString();
  },

  async load() {
    const body = document.getElementById('enrBody');
    try {
      const rows = await api('/enrollments' + (this.query() ? '?' + this.query() : ''));
      document.getElementById('enrCount').textContent = `${rows.length} records`;

      if (!rows.length) {
        body.innerHTML = `<tr><td colspan="6" class="empty-state">
          ${ICONS.empty}<h4>No enrollments found</h4>
          <p>Use "New Enrollment" to enroll a student.</p></td></tr>`;
        return;
      }

      body.innerHTML = rows
        .map(
          (r) => `
          <tr>
            <td><div class="cell-person"><div class="avatar-sm">${escapeHtml(initials(r.student_name))}</div>
              <div><strong>${escapeHtml(r.student_name)}</strong><small>${escapeHtml(r.student_code)}</small></div></div></td>
            <td><strong>${escapeHtml(r.course_name)}</strong><br><span class="mono">${escapeHtml(r.course_code)}</span></td>
            <td class="muted">${escapeHtml(r.faculty_name || 'Unassigned')}</td>
            <td>
              <div class="muted">${escapeHtml(formatDate(r.enrollment_date))}</div>
              ${r.status === 'Cancelled' && r.cancelled_date ? `<small class="muted">Cancelled ${escapeHtml(formatDate(r.cancelled_date))}</small>` : ''}
            </td>
            <td>${statusBadge(r.status)}</td>
            <td class="td-actions">
              ${r.status === 'Enrolled'
                ? `<button class="icon-btn-sm danger" title="Cancel enrollment" onclick="Views.enrollments.cancel(${r.id}, ${JSON.stringify(r.student_name).replace(/"/g, '&quot;')}, ${JSON.stringify(r.course_name).replace(/"/g, '&quot;')})">${ICONS.del}</button>`
                : '<span class="muted" style="font-size:12px">Cancelled</span>'}
            </td>
          </tr>`
        )
        .join('');
    } catch (e) {
      body.innerHTML = `<tr><td colspan="6" class="empty-state"><p>${escapeHtml(e.message)}</p></td></tr>`;
    }
  },

  async openForm() {
    const opts = await api('/enrollments/options');

    if (!opts.students.length || !opts.courses.length) {
      openModal(
        'New Enrollment',
        `
        <div class="empty-state">
          ${ICONS.empty}
          <h4>${!opts.students.length ? 'No students available' : 'No courses available'}</h4>
          <p>${!opts.students.length ? 'Add some students first.' : 'Add some courses first.'}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeModal()">Close</button>
          <button class="btn btn-primary" onclick="closeModal(); navigate('${!opts.students.length ? 'students' : 'courses'}')">
            Go to ${!opts.students.length ? 'Students' : 'Courses'}
          </button>
        </div>`
      );
      return;
    }

    openModal(
      'New Enrollment',
      `
      <p class="modal-sub">A student can be enrolled in the same course only once. Seats are checked automatically.</p>
      <form id="enrollForm">
        <div class="form-grid">
          <div class="field">
            <label>Student <em>*</em></label>
            <select name="studentId" id="enrStudent" required>
              <option value="">Select student…</option>
              ${opts.students.map((s) => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.student_id)})</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Course <em>*</em></label>
            <select name="courseId" id="enrCourse" required>
              <option value="">Select course…</option>
              ${opts.courses.map((c) => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.course_id)})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="info-grid" id="enrSummary" hidden>
          <div class="info-item"><div class="k">Seats Left</div><div class="v" id="enrSeats">—</div></div>
          <div class="info-item"><div class="k">Credits</div><div class="v" id="enrCredits">—</div></div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Enroll Student</button>
        </div>
      </form>`
    );

    const courseSel = document.getElementById('enrCourse');
    courseSel.addEventListener('change', () => {
      const c = opts.courses.find((x) => String(x.id) === String(courseSel.value));
      const box = document.getElementById('enrSummary');
      if (c) {
        document.getElementById('enrSeats').textContent = `${c.seats} available`;
        document.getElementById('enrCredits').textContent = `${c.credits} credits`;
        box.hidden = false;
      } else {
        box.hidden = true;
      }
    });

    document.getElementById('enrollForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formToObject(e.target);
      if (!data.studentId) { showToast('Select a student.', 'error'); return; }
      if (!data.courseId) { showToast('Select a course.', 'error'); return; }
      try {
        await api('/enrollments', { method: 'POST', body: data });
        showToast('Student enrolled successfully.', 'success');
        closeModal();
        this.load();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  },

  async cancel(id, student, course) {
    const ok = await confirmDialog('Cancel Enrollment', `Cancel ${student}'s enrollment in ${course}? The seat will be released back to the course.`);
    if (!ok) return;
    try {
      await api('/enrollments/' + id, { method: 'DELETE' });
      showToast('Enrollment cancelled.', 'success');
      this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },
};