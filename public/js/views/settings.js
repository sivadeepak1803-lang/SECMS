window.Views = window.Views || {};

Views.settings = {
  render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Settings</h2>
          <p class="sub">Manage your account, profile and security.</p>
        </div>
      </div>

      <div class="settings-grid">
        <div class="card setting-card">
          <h3>Profile</h3>
          <p class="sub">Update your administrator details.</p>
          <form id="profileForm">
            <div class="form-grid">
              <div class="field">
                <label>Display Name <em>*</em></label>
                <input name="name" id="setName" required placeholder="Administrator name" />
              </div>
              <div class="field">
                <label>Email <em>*</em></label>
                <input name="email" id="setEmail" type="email" required placeholder="admin@college.edu" />
              </div>
              <div class="field field-full">
                <label>Username</label>
                <input name="username" id="setUsername" disabled />
                <div class="field-hint">Username cannot be changed.</div>
              </div>
            </div>
            <div class="modal-actions" style="margin-top:0">
              <button type="submit" class="btn btn-primary">Save Profile</button>
            </div>
          </form>
        </div>

        <div class="card setting-card">
          <h3>Change Password</h3>
          <p class="sub">Use at least 6 characters.</p>
          <form id="passForm">
            <div class="field">
              <label>Current Password <em>*</em></label>
              <div class="input-wrap">
                <input name="currentPassword" id="passCur" type="password" required autocomplete="current-password" />
                <button type="button" class="toggle-pass" data-target="passCur">Show</button>
              </div>
            </div>
            <div class="form-grid">
              <div class="field">
                <label>New Password <em>*</em></label>
                <input name="newPassword" id="passNew" type="password" required minlength="6" autocomplete="new-password" />
              </div>
              <div class="field">
                <label>Confirm New Password <em>*</em></label>
                <input id="passConfirm" type="password" required minlength="6" autocomplete="new-password" />
              </div>
            </div>
            <div class="modal-actions" style="margin-top:0">
              <button type="submit" class="btn btn-cyan">Update Password</button>
            </div>
          </form>
        </div>

        <div class="card setting-card">
          <h3>System Information</h3>
          <p class="sub">About this installation.</p>
          <div class="sys-info">
            <div class="sys-row"><span class="k">Application</span><span class="v">SECMS v1.0.0</span></div>
            <div class="sys-row"><span class="k">Backend</span><span class="v">Node.js + Express</span></div>
            <div class="sys-row"><span class="k">Database</span><span class="v" id="sysDb">SQLite</span></div>
            <div class="sys-row"><span class="k">Data Folder</span><span class="v">/data/college.db</span></div>
          </div>
        </div>

        <div class="card setting-card">
          <h3>Database Snapshot</h3>
          <p class="sub">Current record counts in the system.</p>
          <div class="sys-info" id="snapshot">
            <div class="sys-row"><span class="k">Students</span><span class="v" id="snapStudents">—</span></div>
            <div class="sys-row"><span class="k">Courses</span><span class="v" id="snapCourses">—</span></div>
            <div class="sys-row"><span class="k">Faculty</span><span class="v" id="snapFaculty">—</span></div>
            <div class="sys-row"><span class="k">Enrollment Records</span><span class="v" id="snapEnroll">—</span></div>
          </div>
        </div>
      </div>
    `;

    this.init();
  },

  async init() {
    try {
      const me = await api('/auth/me');
      document.getElementById('setName').value = me.admin.name || me.admin.username;
      document.getElementById('setEmail').value = me.admin.email || '';
      document.getElementById('setUsername').value = me.admin.username;
    } catch (e) { /* session handling in api */ }

    try {
      const stats = await api('/dashboard/stats');
      document.getElementById('snapStudents').textContent = stats.totals.students;
      document.getElementById('snapCourses').textContent = stats.totals.courses;
      document.getElementById('snapFaculty').textContent = stats.totals.faculty;
      document.getElementById('snapEnroll').textContent =
        stats.totals.enrollments + stats.totals.cancelled;
    } catch (e) { /* ignore */ }

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formToObject(e.target);
      delete data.username;
      try {
        await api('/settings/profile', { method: 'PUT', body: data });
        showToast('Profile updated successfully.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    document.getElementById('passForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = formToObject(e.target);
      const confirm = document.getElementById('passConfirm').value;
      if (data.newPassword !== confirm) {
        showToast('New passwords do not match.', 'error');
        return;
      }
      try {
        await api('/settings/password', { method: 'PUT', body: data });
        showToast('Password changed successfully.', 'success');
        e.target.reset();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    document.querySelectorAll('.toggle-pass').forEach((b) => {
      b.addEventListener('click', () => {
        const input = document.getElementById(b.dataset.target);
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        b.textContent = show ? 'Hide' : 'Show';
      });
    });
  },
};