async function api(path, options = {}) {
  const opts = { ...options };
  opts.headers = { ...(opts.headers || {}) };
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
    opts.headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch('/api' + path, opts);
  } catch (e) {
    showToast('Network error. Is the server running?', 'error');
    throw new Error('Network error. Is the server running?');
  }

  let data = {};
  try { data = await res.json(); } catch (e) { data = {}; }

  if (res.status === 401) {
    if (window.location.pathname.endsWith('app.html')) {
      showToast('Session expired. Please login again.', 'error');
      setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    }
    throw new Error(data.error || 'Unauthorized');
  }

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}