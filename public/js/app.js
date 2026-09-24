const VIEW_META = {
  dashboard: { title: 'Dashboard', sub: 'Welcome back! Here is what is happening today.' },
  students: { title: 'Students', sub: 'Manage student records, admissions and profiles.' },
  courses: { title: 'Courses', sub: 'Add, edit and organize your course catalog.' },
  faculty: { title: 'Faculty', sub: 'Manage faculty members and their courses.' },
  enrollments: { title: 'Enrollments', sub: 'Enroll students into courses and track progress.' },
  reports: { title: 'Reports', sub: 'Analytics and statistics across the college.' },
  settings: { title: 'Settings', sub: 'Account details and preferences.' },
};

let activeView = 'dashboard';

function navigate(viewName) {
  activeView = viewName;
  document.querySelectorAll('.nav-item[data-view]').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === viewName);
  });

  const meta = VIEW_META[viewName];
  document.getElementById('pageTitle').textContent = meta.title;
  document.getElementById('pageSub').textContent = meta.sub;

  closeSidebar();
  Views[viewName].render();
}

/* ---------- Modal ---------- */
function openModal(title, bodyHtml, modifier) {
  document.getElementById('modalTitle').textContent = title;
  const modal = document.getElementById('modal');
  modal.className = 'modal' + (modifier ? ' ' + modifier : '');
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalBackdrop').hidden = false;
  document.body.style.overflow = 'hidden';
  modal.querySelectorAll('input, select, textarea').forEach((f) => {
    if (!f.value) f.setAttribute('_init', '1');
  });
  const first = modal.querySelector('input:not([type=hidden]):not([readonly])');
  if (first) requestAnimationFrame(() => first.focus());
}

function closeModal() {
  document.getElementById('modalBackdrop').hidden = true;
  document.getElementById('modalBody').innerHTML = '';
  document.body.style.overflow = '';
  if (window.__confirmResolve) {
    window.__confirmResolve(false);
    window.__confirmResolve = null;
  }
}

function confirmDialog(title, message) {
  return new Promise((resolve) => {
    window.__confirmResolve = resolve;
    openModal(
      title,
      `<p style="font-size:14px;color:var(--text);line-height:1.6">${escapeHtml(message)}</p>
       <div class="modal-actions">
         <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
         <button class="btn btn-danger" id="confirmYes">Yes, continue</button>
       </div>`,
      'modal-slim'
    );
    document.getElementById('confirmYes').addEventListener('click', () => {
      const r = window.__confirmResolve;
      window.__confirmResolve = null;
      closeModal();
      if (r) r(true);
    });
  });
}

/* ---------- Sidebar (mobile) ---------- */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebarBackdrop');
  const open = !sb.classList.contains('open');
  sb.classList.toggle('open', open);
  bd.classList.toggle('show', open);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('show');
}

document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebar);

document.getElementById('sidebarNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item[data-view]');
  if (btn) navigate(btn.dataset.view);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  const ok = await confirmDialog('Logout', 'Are you sure you want to sign out of SECMS?');
  if (!ok) return;
  try {
    await api('/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = 'login.html';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('modalBackdrop').hidden) {
    closeModal();
  }
});

/* ---------- Init ---------- */
(async function init() {
  let admin = null;
  try {
    const data = await api('/auth/me');
    admin = data.admin;
  } catch (e) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('adminName').textContent = admin.name || admin.username;
  document.getElementById('adminEmail').textContent = admin.email || 'admin@college.edu';
  document.getElementById('adminAvatar').textContent = initials(admin.name || admin.username);

  navigate('dashboard');
})();