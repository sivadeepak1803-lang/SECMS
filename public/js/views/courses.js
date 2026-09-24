window.Views = window.Views || {};

Views.courses = {
  state: { search: '', department: '' },

  render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Courses</h2>
          <p class="sub">Add, edit and organize your course catalog.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="Views.courses.openForm()">
            ${ICONS.plus} Add Course
          </button>
        </div>
      </div>

      <div class="card toolbar">
        <div class="search-field">
          ${ICONS.search}
          <input type="text" id="crsSearch" placeholder="Search by name, code, department or faculty…" value="${escapeHtml(this.state.search)}" />
        </div>
        <select class="filter-select" id="crsDept">${depOptions(this.state.department)}</select>
      </div>

      <div class="card table-card">
        <div class="table-head">
          <h3>Course Catalog</h3>
          <div class="right"><span class="count-chip" id="crsCount">0 courses</span></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Course ID</th><th>Course Name</th><th>Department</th><th>Credits</th>
                <th>Faculty</th><th>Seats Left</th><th>Enrolled</th><th class="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody id="crsBody">
              <tr><td colspan="8" class="empty-state"><p>Loading courses…</p></td></tr>
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
      this.state.search = document.getElementById('crsSearch').value.trim();
      this.state.department = document.getElementById('crsDept').value;
      this.load();
    });
    document.getElementById('crsSearch').addEventListener('input', reload);
    document.getElementById('crsDept').addEventListener('change', reload);
  },

  query() {
    const p = new URLSearchParams();
    if (this.state.search) p.set('search', this.state.search);
    if (this.state.department) p.set('department', this.state.department);
    return p.toString();
  },

  async load() {
    const body = document.getElementById('crsBody');
    try {
      const rows = await api('/courses' + (this.query() ? '?' + this.query() : ''));
      document.getElementById('crsCount').textContent = `${rows.length} courses`;

      if (!rows.length) {
        body.innerHTML = `<tr><td colspan="8" class="empty-state">
          ${ICONS.empty}<h4>No courses found</h4>
          <p>Try changing the filters or add a new course.</p></td></tr>`;
        return;
      }

      body.innerHTML = rows
        .map(
          (c) => `
          <tr>
            <td class="mono">${escapeHtml(c.course_id)}</td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td class="muted">${escapeHtml(c.department)}</td>
            <td><span class="badge count plain info">${c.credits} cr</span></td>
            <td>${c.faculty_name ? `<div class="cell-person"><div class="avatar-sm">${escapeHtml(initials(c.faculty_name))}</div>${escapeHtml(c.faculty_name)}</div>` : '<span class="badge warn">Unassigned</span>'}</td>
            <td><span class="badge ${c.seats <= 10 ? 'warn' : 'success'} count plain">${c.seats} left</span></td>
            <td><span class="badge count plain muted">${c.enrolled_count} enrolled</span></td>
            <td class="td-actions">
              <button class="icon-btn-sm" title="View" onclick="Views.courses.viewDetails(${c.id})">${ICONS.view}</button>
              <button class="icon-btn-sm" title="Edit" onclick="Views.courses.openForm(${c.id})">${ICONS.edit}</button>
              <button class="icon-btn-sm danger" title="Delete" onclick="Views.courses.remove(${c.id}, ${JSON.stringify(c.name).replace(/"/g, '&quot;')})">${ICONS.del}</button>
            </td>
          </tr>`
        )
        .join('');
    } catch (e) {
      body.innerHTML = `<tr><td colspan="8" class="empty-state"><p>${escapeHtml(e.message)}</p></td></tr>`;
    }
  },

  facultySelect(selected, facultyList) {
    const options =
      '<option value="">— Unassigned —</option>' +
      facultyList.map((f) => `<option value="${f.id}" ${String(selected) === String(f.id) ? 'selected' : ''}>${escapeHtml(f.name)} (${escapeHtml(f.faculty_id)})</option>`).join('');
    return options;
  },

  async openForm(id) {
    const facultyList = await api('/faculty');
    let course = null;
    if (id) {
      const data = await api('/courses/' + id);
      course = data.course;
    } else {
      try {
        const hint = await api('/courses/next-id');
        course = { course_id: hint.course_id, seats: 30, credits: 3 };
      } catch (e) { course = { seats: 30, credits: 3 }; }
    }

    openModal(
      id ? 'Edit Course' : 'Add Course',
      `
      <form id="entityForm" novalidate>
        <div class="form-grid">
          <div class="field">
            <label>Course ID <em>*</em></label>
            <input name="course_id" value="${escapeHtml(course.course_id || '')}" required placeholder="e.g. CSE101" />
          </div>
          <div class="field">
            <label>Course Name <em>*</em></label>
            <input name="name" value="${escapeHtml(course.name || '')}" required placeholder="e.g. Data Structures" />
          </div>
          <div class="field">
            <label>Department <em>*</em></label>
            <select name="department" required>${depOptions(course.department)}</select>
          </div>
          <div class="field">
            <label>Credits <em>*</em></label>
            <select name="credits" required>
              ${[1,2,3,4,5,6].map((c) => `<option value="${c}" ${String(course.credits) === String(c) ? 'selected' : ''}>${c} credits</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Available Seats <em>*</em></label>
            <input name="seats" type="number" min="0" max="1000" value="${course.seats ?? 30}" required />
            ${id ? '<div class="field-hint">Seats cannot go below the current number of enrolled students.</div>' : ''}
          </div>
          <div class="field">
            <label>Assigned Faculty</label>
            <select name="faculty_id">${this.facultySelect(course.faculty_id, facultyList)}</select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${id ? 'Save Changes' : 'Add Course'}</button>
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
        await api('/courses/' + id, { method: 'PUT', body: data });
        showToast('Course updated successfully.', 'success');
      } else {
        await api('/courses', { method: 'POST', body: data });
        showToast('Course added successfully.', 'success');
      }
      closeModal();
      this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async remove(id, name) {
    const ok = await confirmDialog('Delete Course', `Are you sure you want to delete "${name}"? All enrollments in this course will also be removed.`);
    if (!ok) return;
    try {
      await api('/courses/' + id, { method: 'DELETE' });
      showToast('Course deleted.', 'success');
      this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async viewDetails(id) {
    const data = await api('/courses/' + id);
    const c = data.course;
    const enrolled = data.enrollments.filter((e) => e.status === 'Enrolled');
    const cancelled = data.enrollments.filter((e) => e.status === 'Cancelled');

    openModal(
      'Course Details',
      `
      <div class="profile-header">
        <div class="profile-avatar">${escapeHtml(c.course_id.slice(0, 2))}</div>
        <div>
          <h3>${escapeHtml(c.name)}</h3>
          <p>${escapeHtml(c.course_id)} &middot; ${escapeHtml(c.department)}</p>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item"><div class="k">Credits</div><div class="v">${c.credits}</div></div>
        <div class="info-item"><div class="k">Faculty</div><div class="v">${c.faculty_name ? escapeHtml(c.faculty_name) : 'Unassigned'}</div></div>
        <div class="info-item"><div class="k">Seats Left</div><div class="v">${c.seats}</div></div>
        <div class="info-item"><div class="k">Enrolled</div><div class="v">${enrolled.length} active / ${cancelled.length} cancelled</div></div>
      </div>

      <div class="detail-section">
        <h4>Enrolled Students (${enrolled.length})</h4>
        ${enrolled.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Student</th><th>ID</th><th>Department</th><th>Enrolled On</th></tr></thead>
              <tbody>
                ${enrolled
                  .map(
                    (e) => `
                    <tr>
                      <td><div class="cell-person"><div class="avatar-sm">${escapeHtml(initials(e.student_name))}</div>${escapeHtml(e.student_name)}</div></td>
                      <td class="mono">${escapeHtml(e.student_code)}</td>
                      <td class="muted">${escapeHtml(e.student_department)}</td>
                      <td class="muted">${escapeHtml(formatDate(e.enrollment_date))}</td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty-state"><p>No students enrolled yet.</p></div>'}
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="closeModal(); Views.courses.openForm(${c.id})">Edit Course</button>
      </div>`,
      'modal-lg'
    );
  },
};