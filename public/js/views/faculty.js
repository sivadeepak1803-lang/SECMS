window.Views = window.Views || {};

Views.faculty = {
  state: { search: '', department: '' },

  render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Faculty</h2>
          <p class="sub">Manage faculty members and assign them to courses.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="Views.faculty.openForm()">
            ${ICONS.plus} Add Faculty
          </button>
        </div>
      </div>

      <div class="card toolbar">
        <div class="search-field">
          ${ICONS.search}
          <input type="text" id="facSearch" placeholder="Search by name, ID, email or phone…" value="${escapeHtml(this.state.search)}" />
        </div>
        <select class="filter-select" id="facDept">${depOptions(this.state.department)}</select>
      </div>

      <div class="card table-card">
        <div class="table-head">
          <h3>Faculty Members</h3>
          <div class="right"><span class="count-chip" id="facCount">0 members</span></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Faculty ID</th><th>Name</th><th>Email</th><th>Department</th>
                <th>Designation</th><th>Courses</th><th class="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody id="facBody">
              <tr><td colspan="7" class="empty-state"><p>Loading faculty…</p></td></tr>
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
      this.state.search = document.getElementById('facSearch').value.trim();
      this.state.department = document.getElementById('facDept').value;
      this.load();
    });
    document.getElementById('facSearch').addEventListener('input', reload);
    document.getElementById('facDept').addEventListener('change', reload);
  },

  query() {
    const p = new URLSearchParams();
    if (this.state.search) p.set('search', this.state.search);
    if (this.state.department) p.set('department', this.state.department);
    return p.toString();
  },

  async load() {
    const body = document.getElementById('facBody');
    try {
      const rows = await api('/faculty' + (this.query() ? '?' + this.query() : ''));
      document.getElementById('facCount').textContent = `${rows.length} members`;

      if (!rows.length) {
        body.innerHTML = `<tr><td colspan="7" class="empty-state">
          ${ICONS.empty}<h4>No faculty members found</h4>
          <p>Try changing the filters or add a new member.</p></td></tr>`;
        return;
      }

      body.innerHTML = rows
        .map(
          (f) => `
          <tr>
            <td class="mono">${escapeHtml(f.faculty_id)}</td>
            <td><div class="cell-person"><div class="avatar-sm">${escapeHtml(initials(f.name))}</div><strong>${escapeHtml(f.name)}</strong></div></td>
            <td class="muted">${escapeHtml(f.email)}</td>
            <td class="muted">${escapeHtml(f.department)}</td>
            <td><span class="badge count plain info">${escapeHtml(f.designation)}</span></td>
            <td><span class="badge count plain ${f.assigned_courses ? 'success' : 'muted'}">${f.assigned_courses} course${f.assigned_courses === 1 ? '' : 's'}</span></td>
            <td class="td-actions">
              <button class="icon-btn-sm" title="View" onclick="Views.faculty.viewDetails(${f.id})">${ICONS.view}</button>
              <button class="icon-btn-sm" title="Edit" onclick="Views.faculty.openForm(${f.id})">${ICONS.edit}</button>
              <button class="icon-btn-sm danger" title="Delete" onclick="Views.faculty.remove(${f.id}, ${JSON.stringify(f.name).replace(/"/g, '&quot;')})">${ICONS.del}</button>
            </td>
          </tr>`
        )
        .join('');
    } catch (e) {
      body.innerHTML = `<tr><td colspan="7" class="empty-state"><p>${escapeHtml(e.message)}</p></td></tr>`;
    }
  },

  async openForm(id) {
    let member = null;
    if (id) {
      const data = await api('/faculty/' + id);
      member = data.faculty;
    } else {
      member = {};
    }

    openModal(
      id ? 'Edit Faculty' : 'Add Faculty',
      `
      <form id="entityForm" novalidate>
        <div class="form-grid">
          <div class="field">
            <label>Faculty ID <em>*</em></label>
            <input name="faculty_id" value="${escapeHtml(member.faculty_id || '')}" required placeholder="e.g. FAC001" />
          </div>
          <div class="field">
            <label>Full Name <em>*</em></label>
            <input name="name" value="${escapeHtml(member.name || '')}" required placeholder="e.g. Dr. John Carter" />
          </div>
          <div class="field">
            <label>Email <em>*</em></label>
            <input name="email" type="email" value="${escapeHtml(member.email || '')}" required placeholder="john@college.edu" />
          </div>
          <div class="field">
            <label>Phone</label>
            <input name="phone" value="${escapeHtml(member.phone || '')}" placeholder="+91 98765 43210" />
          </div>
          <div class="field">
            <label>Department <em>*</em></label>
            <select name="department" required>${depOptions(member.department)}</select>
          </div>
          <div class="field">
            <label>Designation</label>
            <select name="designation">
              ${DESIGNATIONS.map((d) => `<option value="${escapeHtml(d)}" ${String(member.designation || 'Assistant Professor') === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${id ? 'Save Changes' : 'Add Faculty'}</button>
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
        await api('/faculty/' + id, { method: 'PUT', body: data });
        showToast('Faculty member updated successfully.', 'success');
      } else {
        await api('/faculty', { method: 'POST', body: data });
        showToast('Faculty member added successfully.', 'success');
      }
      closeModal();
      this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async remove(id, name) {
    const ok = await confirmDialog('Delete Faculty', `Are you sure you want to delete "${name}"? Any courses they teach will become unassigned.`);
    if (!ok) return;
    try {
      await api('/faculty/' + id, { method: 'DELETE' });
      showToast('Faculty member deleted.', 'success');
      this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async viewDetails(id) {
    const data = await api('/faculty/' + id);
    const f = data.faculty;

    openModal(
      'Faculty Details',
      `
      <div class="profile-header">
        <div class="profile-avatar">${escapeHtml(initials(f.name))}</div>
        <div>
          <h3>${escapeHtml(f.name)}</h3>
          <p>${escapeHtml(f.designation)} &middot; ${escapeHtml(f.faculty_id)}</p>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item"><div class="k">Email</div><div class="v">${escapeHtml(f.email)}</div></div>
        <div class="info-item"><div class="k">Phone</div><div class="v">${escapeHtml(f.phone || '—')}</div></div>
        <div class="info-item"><div class="k">Department</div><div class="v">${escapeHtml(f.department)}</div></div>
        <div class="info-item"><div class="k">Courses Taught</div><div class="v">${data.courses.length}</div></div>
      </div>

      <div class="detail-section">
        <h4>Assigned Courses (${data.courses.length})</h4>
        ${data.courses.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Course</th><th>Code</th><th>Credits</th><th>Enrolled</th></tr></thead>
              <tbody>
                ${data.courses
                  .map(
                    (c) => `
                    <tr>
                      <td><strong>${escapeHtml(c.name)}</strong></td>
                      <td class="mono">${escapeHtml(c.course_id)}</td>
                      <td><span class="badge count plain info">${c.credits} cr</span></td>
                      <td><span class="badge count plain muted">${c.enrolled_count} enrolled</span></td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty-state"><p>No courses assigned yet.</p></div>'}
      </div>

      <div class="detail-section">
        <h4>Assign a Course</h4>
        <form id="assignForm">
          <div class="field">
            <select name="courseId" required>
              <option value="">Select a course…</option>
              ${data.unassigned.map((c) => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.course_id)})</option>`).join('')}
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" onclick="closeModal()">Close</button>
            <button type="submit" class="btn btn-cyan">Assign Course</button>
          </div>
        </form>
      </div>`,
      'modal-lg'
    );

    document.getElementById('assignForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const courseId = formToObject(e.target).courseId;
      if (!courseId) { showToast('Select a course to assign.', 'error'); return; }
      try {
        await api(`/faculty/${id}/assign-course`, { method: 'POST', body: { courseId } });
        showToast('Course assigned successfully.', 'success');
        closeModal();
        this.load();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  },
};