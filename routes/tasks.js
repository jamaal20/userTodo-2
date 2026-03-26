const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// All routes require auth
router.use(auth);

// GET /api/tasks — fetch all tasks for the logged-in user
router.get('/', (req, res) => {
  const tasks = db.prepare(
    'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(tasks);
});

// POST /api/tasks — create a new task
router.post('/', (req, res) => {
  const { title, description = '', priority = 'medium', due_date = null } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const result = db.prepare(
    'INSERT INTO tasks (user_id, title, description, priority, due_date) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, title.trim(), description.trim(), priority, due_date);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// PUT /api/tasks/:id — update a task
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const {
    title = task.title,
    description = task.description,
    completed = task.completed,
    priority = task.priority,
    due_date = task.due_date
  } = req.body;

  db.prepare(
    'UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ?, due_date = ? WHERE id = ?'
  ).run(title, description, completed ? 1 : 0, priority, due_date, id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/tasks/:id — delete a task
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
