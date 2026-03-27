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
}

function showError(elementId, message) {
  document.getElementById(elementId).textContent = message;
}

/* ---- API calls ---- */
async function apiCall(endpoint, data) {
  try {
    const response = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }
    
    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/* ---- Event handlers ---- */
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  
  if (!username || !password) {
    showError('login-error', 'Please enter username and password');
    return;
  }

  setLoading('login-btn', true);
  showError('login-error', '');

  try {
    const result = await apiCall('auth/login', { username, password });
    
    // Store token and redirect
    localStorage.setItem('token', result.token);
    localStorage.setItem('username', result.username);
    window.location.href = '/app.html';
    
  } catch (error) {
    showError('login-error', error.message);
  } finally {
    setLoading('login-btn', false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  
  if (!username || !password) {
    showError('register-error', 'Please fill all fields');
    return;
  }
  
  if (password.length < 6) {
    showError('register-error', 'Password must be at least 6 characters');
    return;
  }
  
  if (password !== confirm) {
    showError('register-error', 'Passwords do not match');
    return;
  }

  setLoading('register-btn', true);
  showError('register-error', '');

  try {
    const result = await apiCall('auth/register', { username, password });
    
    // Store token and redirect
    localStorage.setItem('token', result.token);
    localStorage.setItem('username', result.username);
    window.location.href = '/app.html';
    
  } catch (error) {
    showError('register-error', error.message);
  } finally {
    setLoading('register-btn', false);
  }
}

/* ---- Initialize ---- */
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });

  // Form submissions
  document.getElementById('form-login').addEventListener('submit', handleLogin);
  document.getElementById('form-register').addEventListener('submit', handleRegister);
});
