// =============================================
//  auth.js — Login & Register logic
// =============================================

// Redirect to app if already logged in
if (localStorage.getItem('token')) {
  window.location.href = '/app.html';
}

/* ---- Tab switching ---- */
function switchTab(tab) {
  const tabs   = ['login', 'register'];
  const forms  = { login: 'form-login', register: 'form-register' };
  const tabEls = { login: 'tab-login',  register: 'tab-register' };

  tabs.forEach(t => {
    document.getElementById(forms[t]).classList.toggle('hidden', t !== tab);
    document.getElementById(tabEls[t]).classList.toggle('active', t === tab);
  });

  // Clear errors
  document.getElementById('login-error').textContent = '';
  document.getElementById('register-error').textContent = '';
}

/* ---- Helpers ---- */
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.querySelector('.btn-text').classList.toggle('hidden', loading);
  btn.querySelector('.btn-spinner').classList.toggle('hidden', !loading);
  btn.disabled = loading;
}

function showError(id, msg) {
  document.getElementById(id).textContent = msg;
}

async function authRequest(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

/* ---- Login ---- */
async function handleLogin(e) {
  e.preventDefault();
  showError('login-error', '');
  setLoading('login-btn', true);

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const data = await authRequest('/api/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    window.location.href = '/app.html';
  } catch (err) {
    showError('login-error', err.message);
  } finally {
    setLoading('login-btn', false);
  }
}

/* ---- Register ---- */
async function handleRegister(e) {
  e.preventDefault();
  showError('register-error', '');

  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;

  if (password !== confirm) {
    return showError('register-error', 'Passwords do not match');
  }

  setLoading('register-btn', true);
  try {
    const data = await authRequest('/api/auth/register', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    window.location.href = '/app.html';
  } catch (err) {
    showError('register-error', err.message);
  } finally {
    setLoading('register-btn', false);
  }
}
