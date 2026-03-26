// Fallback database for local development when Vercel Postgres is not available
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

let db;

try {
  db = new Database(path.join(__dirname, 'todo-local.db'));
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      due_date TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  console.log('Local SQLite database initialized');
} catch (error) {
  console.error('Local database error:', error);
  db = null;
}

// User operations
async function createUser(username, passwordHash) {
  if (!db) throw new Error('Database not available');
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
  return { id: result.lastInsertRowid, username, created_at: new Date().toISOString() };
}

async function getUserByUsername(username) {
  if (!db) throw new Error('Database not available');
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

async function getUserById(id) {
  if (!db) throw new Error('Database not available');
  return db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(id);
}

// Task operations
async function createTask(userId, title, description = '', priority = 'medium', dueDate = null) {
  if (!db) throw new Error('Database not available');
  const result = db.prepare('INSERT INTO tasks (user_id, title, description, priority, due_date) VALUES (?, ?, ?, ?, ?)').run(userId, title, description, priority, dueDate);
  return { id: result.lastInsertRowid, user_id: userId, title, description, priority, due_date, completed: false, created_at: new Date().toISOString() };
}

async function getTasksByUserId(userId) {
  if (!db) throw new Error('Database not available');
  return db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

async function updateTask(taskId, userId, updates) {
  if (!db) throw new Error('Database not available');
  const { title, description, completed, priority, dueDate } = updates;
  const result = db.prepare('UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ?, due_date = ? WHERE id = ? AND user_id = ?').run(title, description, completed ? 1 : 0, priority, dueDate, taskId, userId);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
}

async function deleteTask(taskId, userId) {
  if (!db) throw new Error('Database not available');
  const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(taskId, userId);
  return result.changes > 0 ? { success: true } : null;
}

module.exports = {
  initDatabase: async () => console.log('Local database ready'),
  createUser,
  getUserByUsername,
  getUserById,
  createTask,
  getTasksByUserId,
  updateTask,
  deleteTask
};
