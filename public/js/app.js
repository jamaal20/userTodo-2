// =============================================
//  app.js — Main dashboard logic
// =============================================

const token    = localStorage.getItem('token');
const username = localStorage.getItem('username');

// Guard: redirect if not logged in
if (!token) {
  window.location.href = '/';
}

// State
let tasks       = [];
let currentFilter = 'all';
let editingId   = null;

/* ============================================
   Init
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('header-username').textContent = `👤 ${username}`;
  loadTasks();
});

/* ============================================
   API helpers
   ============================================ */
async function api(method, endpoint, body) {
  const opts = {
    method,
    headers: {
      'Content-Type'  : 'application/json',
      'Authorization' : `Bearer ${token}`
    }
  };
  if (body) opts.body = JSON.stringify(body);
  
  // Update endpoints to match new structure
  let url = '/api' + endpoint;
  if (method === 'POST' && endpoint === '/tasks') {
    url = '/api/tasks/create';
  }
  
  const res = await fetch(url, opts);
  if (res.status === 401) { logout(); return; }
  return res.json();
}

/* ============================================
   Load all tasks
   ============================================ */
async function loadTasks() {
  tasks = await api('GET', '/tasks');
  renderTasks();
  updateStats();
}

/* ============================================
   Render tasks
   ============================================ */
function getFilteredTasks() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase();

  return tasks.filter(t => {
    const matchesFilter =
      currentFilter === 'all'       ? true :
      currentFilter === 'active'    ? !t.completed :
      currentFilter === 'completed' ? !!t.completed :
      currentFilter === 'high'      ? t.priority === 'high' :
      true;

    const matchesSearch = !query ||
      t.title.toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No tasks here</div>
        <div class="empty-sub">Add a new task to get started!</div>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(t => taskCardHTML(t)).join('');
}

function taskCardHTML(t) {
  const priorityLabel = t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
  const dueHTML = t.due_date ? (() => {
    const today    = new Date().toISOString().split('T')[0];
    const overdue  = !t.completed && t.due_date < today;
    return `<span class="task-due ${overdue ? 'overdue' : ''}">
              📅 ${overdue ? '⚠ Overdue — ' : ''}${t.due_date}
            </span>`;
  })() : '';

  return `
    <div class="task-card ${t.completed ? 'completed' : ''}" id="task-${t.id}">
      <div class="task-check" title="Toggle complete" onclick="toggleTask(${t.id})">
        ${t.completed ? '✓' : ''}
      </div>
      <div class="task-body">
        <div class="task-title">${escapeHTML(t.title)}</div>
        ${t.description ? `<div class="task-desc">${escapeHTML(t.description)}</div>` : ''}
        <div class="task-meta">
          <span class="badge badge-${t.priority}">${priorityLabel}</span>
          ${dueHTML}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon edit-btn"   title="Edit task"   onclick="openModal(${t.id})">✏️</button>
        <button class="btn-icon delete-btn" title="Delete task" onclick="deleteTask(${t.id})">🗑</button>
      </div>
    </div>`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================
   Stats & filter counts
   ============================================ */
function updateStats() {
  const total     = tasks.length;
  const active    = tasks.filter(t => !t.completed).length;
  const done      = tasks.filter(t =>  t.completed).length;
  const high      = tasks.filter(t => t.priority === 'high').length;

  document.getElementById('stat-total').textContent  = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-done').textContent   = done;
  document.getElementById('stat-high').textContent   = high;

  document.getElementById('count-all').textContent       = total;
  document.getElementById('count-active').textContent    = active;
  document.getElementById('count-completed').textContent = done;
  document.getElementById('count-high').textContent      = high;
}

/* ============================================
   Filter
   ============================================ */
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`filter-${filter}`).classList.add('active');
  renderTasks();
}

/* ============================================
   Toggle complete
   ============================================ */
async function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const updated = await api('PUT', `/tasks/${id}`, { ...task, completed: !task.completed });
  applyUpdate(updated);
}

/* ============================================
   Delete
   ============================================ */
async function deleteTask(id) {
  const card = document.getElementById(`task-${id}`);
  if (card) {
    card.style.transition = 'opacity 0.2s, transform 0.2s';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';
    await new Promise(r => setTimeout(r, 200));
  }
  await api('DELETE', `/tasks/delete?id=${id}`);
  tasks = tasks.filter(t => t.id !== id);
  renderTasks();
  updateStats();
}

/* ============================================
   Modal — open / close
   ============================================ */
function openModal(id = null) {
  editingId = id;
  const modal = document.getElementById('modal-overlay');
  modal.classList.remove('hidden');

  if (id) {
    const task = tasks.find(t => t.id === id);
    document.getElementById('modal-title').textContent       = 'Edit Task';
    document.getElementById('task-title').value              = task.title;
    document.getElementById('task-description').value        = task.description || '';
    document.getElementById('task-priority').value           = task.priority;
    document.getElementById('task-due').value                = task.due_date || '';
    document.getElementById('save-btn').querySelector('.btn-text').textContent = 'Save Changes';
  } else {
    document.getElementById('modal-title').textContent       = 'New Task';
    document.getElementById('task-form').reset();
    document.getElementById('task-priority').value           = 'medium';
    document.getElementById('save-btn').querySelector('.btn-text').textContent = 'Add Task';
  }

  document.getElementById('task-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  editingId = null;
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ============================================
   Save task (create or update)
   ============================================ */
async function handleSaveTask(e) {
  e.preventDefault();

  const btn = document.getElementById('save-btn');
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-spinner').classList.remove('hidden');
  btn.disabled = true;

  const body = {
    title      : document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-description').value.trim(),
    priority   : document.getElementById('task-priority').value,
    due_date   : document.getElementById('task-due').value || null
  };

  try {
    if (editingId) {
      const task    = tasks.find(t => t.id === editingId);
      const updated = await api('PUT', `/tasks/${editingId}`, { ...task, ...body });
      applyUpdate(updated);
    } else {
      const created = await api('POST', '/tasks', body);
      tasks.unshift(created);
      renderTasks();
      updateStats();
    }
    closeModal();
  } finally {
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-spinner').classList.add('hidden');
    btn.disabled = false;
  }
}

/* ============================================
   Apply a single task update to state
   ============================================ */
function applyUpdate(updated) {
  const idx = tasks.findIndex(t => t.id === updated.id);
  if (idx !== -1) tasks[idx] = updated;
  renderTasks();
  updateStats();
}

/* ============================================
   Logout
   ============================================ */
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = '/';
}
