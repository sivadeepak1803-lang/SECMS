window.Views = window.Views || {};

Views.students = {
  state: { search: '', department: '', year: '' },

  render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Students</h2>
          <p class="sub">Manage student records, admissions and profiles.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="Views.students.openForm()">
            ${ICONS.plus} Add Student
          </button>
        </div>
      </div>

      <div class="card toolbar">
        <div class="search-field">
          ${ICONS.search}
          <input type="text" id="stuSearch" placeholder="Search by name, ID, email or phone…" value="${escapeHtml(this.state.search)}" />
        </div>
        <select class="filter-select" id="stuDept">${depOptions(this.state.department)}</select>
        <select class="filter-select" id="stuYear">${yearOptions(this.state.year)}</select>
      </div>

      <div class="card table-card">
        <div class="table-head">
          <h3>All Students</h3>
          <div class="right"><span class="count-chip" id="stuCount">0 students</span></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Student ID</th><th>Name</th><th>Email</th><th>Phone</th>
                <th>Department</th><th>Year</th><th>Courses</th><th class="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody id="stuBody">
              <tr><td colspan="8" class="empty-state"><p>Loading students…</p></td></tr>
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
      this.state.search = document.getElementById('stuSearch').value.trim();
      this.state.department = document.getElementById('stuDept').value;
      this.state.year = document.getElementById('stuYear').value;
      this.load();
    });

    document.getElementById('stuSearch').addEventListener('input', reload);
    document.getElementById('stuDept').addEventListener('change', reload);
    document.getElementById('stuYear').addEventListener('change', reload);
  },

  query() {
    const p = new URLSearchParams();
    if (this.state.search) p.set('search', this.state.search);
    if (this.state.department) p.set('department', this.state.department);
    if (this.state.year) p.set('year', this.state.year);
    return p.toString();
  },

  async load() {
    const body = document.getElementById('stuBody');
    try {
      const rows = await api('/students' + (this.query() ? '?' + this.query() : ''));
      document.getElementById('stuCount').textContent = `${rows.length} students`;

      if (!rows.length) {
        body.innerHTML = `<tr><td colspan="8" class="empty-state">
          ${ICONS.empty}<h4>No students found</h4>
          <p>Try changing the filters or add a new student.</p></td></tr>`;
        return;
      }

      body.innerHTML = rows
        .map(
          (s) => `
          <tr>
            <td class="mono">${escapeHtml(s.student_id)}</td>
            <td><div class="cell-person"><div class="avatar-sm">${escapeHtml(initials(s.name))}</div><strong>${escapeHtml(s.name)}</strong></div></td>
            <td class="muted">${escapeHtml(s.email)}</td>
            <td class="muted">${escapeHtml(s.phone || '—')}</td>
            <td>${escapeHtml(s.department)}</td>
            <td><span class="badge badge-year plain info">Year ${escapeHtml(s.year)}</span></td>
            <td><span class="badge count plain muted">${s.enrolled_courses} active</span></td>
            <td class="td-actions">
              <button class="icon-btn-sm" title="View" onclick="Views.students.viewDetails(${s.id})">${ICONS.view}</button>
              <button class="icon-btn-sm" title="Edit" onclick="Views.students.openForm(${s.id})">${ICONS.edit}</button>
              <button class="icon-btn-sm danger" title="Delete" onclick="Views.students.remove(${s.id}, ${JSON.stringify(s.name).replace(/"/g, '&quot;')})">${ICONS.del}</button>
            </td>
          </tr>`
        )
        .join('');
    } catch (e) {
      body.innerHTML = `<tr><td colspan="8" class="empty-state"><p>${escapeHtml(e.message)}</p></td></tr>`;
    }
  },

  async openForm(id) {
    let student = null;
    if (id) {
      const data = await api('/students/' + id);
      student = data.student;
    } else {
      try {
        const hint = await api('/students/next-id');
        student = { student_id: hint.student_id };
      } catch (e) { student = {}; }
    }

    openModal(
      id ? 'Edit Student' : 'Add Student',
      `
      <form id="entityForm" novalidate>
        <div class="form-grid">
          <div class="field">
            <label>Student ID <em>*</em></label>
            <input name="student_id" value="${escapeHtml(student.student_id || '')}" required placeholder="e.g. STU0001" />
          </div>
          <div class="field">
            <label>Full Name <em>*</em></label>
            <input name="name" value="${escapeHtml(student.name || '')}" required placeholder="e.g. Alice Brown" />
          </div>
          <div class="field">
            <label>Email <em>*</em></label>
            <input name="email" type="email" value="${escapeHtml(student.email || '')}" required placeholder="alice@college.edu" />
          </div>
          <div class="field">
            <label>Phone</label>
            <input name="phone" value="${escapeHtml(student.phone || '')}" placeholder="+91 98765 43210" />
          </div>
          <div class="field">
            <label>Department <em>*</em></label>
            <select name="department" required>${depOptions(student.department)}</select>
          </div>
          <div class="field">
            <label>Year <em>*</em></label>
            <select name="year" required>${yearOptions(student.year || '')}</select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${id ? 'Save Changes' : 'Add Student'}</button>
        </div>
      </form>`
    );

    document.getElementById('entityForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.save(formToObject(e.target), id);
    });
  },

  async save(data, id) {
    try {
      if (id) {
        await api('/students/' + id, { method: 'PUT', body: data });
        showToast('Student updated successfully.', 'success');
      } else {
        await api('/students', { method: 'POST', body: data });
        showToast('Student added successfully.', 'success');
      }
      closeModal();
      this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async remove(id, name) {
    const ok = await confirmDialog('Delete Student', `Are you sure you want to delete "${name}"? This will also remove all of their enrollments.`);
    if (!ok) return;
    try {
      await api('/students/' + id, { method: 'DELETE' });
      showToast('Student deleted.', 'success');
      this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async viewDetails(id) {
    const data = await api('/students/' + id);
    const s = data.student;
    const active = data.enrollments.filter((e) => e.status === 'Enrolled');
    const cancelled = data.enrollments.filter((e) => e.status === 'Cancelled');

    openModal(
      'Student Details',
      `
      <div class="profile-header">
        <div class="profile-avatar">${escapeHtml(initials(s.name))}</div>
        <div>
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.student_id)} &middot; ${escapeHtml(s.email)}</p>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item"><div class="k">Department</div><div class="v">${escapeHtml(s.department)}</div></div>
        <div class="info-item"><div class="k">Year</div><div class="v">Year ${escapeHtml(s.year)}</div></div>
        <div class="info-item"><div class="k">Phone</div><div class="v">${escapeHtml(s.phone || '—')}</div></div>
        <div class="info-item"><div class="k">Enrolled Courses</div><div class="v">${active.length} active / ${cancelled.length} cancelled</div></div>
      </div>

      <div class="detail-section">
        <h4>Enrollment History (${data.enrollments.length})</h4>
        ${data.enrollments.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Course</th><th>Enrolled On</th><th class="th-actions">Status</th></tr></thead>
              <tbody>
                ${data.enrollments
                  .map(
                    (e) => `
                    <tr>
                      <td><strong>${escapeHtml(e.course_name)}</strong><br><span class="mono">${escapeHtml(e.course_code)}</span></td>
                      <td class="muted">${escapeHtml(formatDate(e.enrollment_date))}</td>
                      <td class="td-actions">${statusBadge(e.status)}</td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>` : `<div class="empty-state"><p>No enrollment history.</p></div>`}
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="closeModal(); Views.students.openForm(${s.id})">Edit Student</button>
      </div>`,
      'modal-lg'
    );
  },
};