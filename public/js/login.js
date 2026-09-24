const form = document.getElementById('loginForm');
const errorBox = document.getElementById('loginError');
const user = document.getElementById('loginUser');
const pass = document.getElementById('loginPass');
const btn = document.getElementById('loginBtn');

document.querySelectorAll('.toggle-pass').forEach((b) => {
  b.addEventListener('click', () => {
    const input = document.getElementById(b.dataset.target);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.textContent = show ? 'Hide' : 'Show';
  });
});

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.hidden = true;

  if (!user.value.trim()) { showError('Username is required.'); user.focus(); return; }
  if (!pass.value) { showError('Password is required.'); pass.focus(); return; }

  btn.disabled = true;
  btn.querySelector('span').textContent = 'Signing in…';

  try {
    await api('/auth/login', {
      method: 'POST',
      body: { username: user.value.trim(), password: pass.value },
    });
    window.location.href = 'app.html';
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Sign In';
  }
});