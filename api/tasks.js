const express = require('express');
const { sql } = require('@vercel/postgres');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Auth middleware
router.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await sql`
      SELECT * FROM tasks WHERE user_id = ${req.user.id} ORDER BY created_at DESC
    `;
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const { title, description = '', priority = 'medium', due_date = null } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title required' });
    }

    const result = await sql`
      INSERT INTO tasks (user_id, title, description, priority, due_date)
      VALUES (${req.user.id}, ${title.trim()}, ${description.trim()}, ${priority}, ${due_date})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed, priority, due_date } = req.body;

    const result = await sql`
      UPDATE tasks 
      SET title = ${title}, description = ${description}, completed = ${completed}, 
          priority = ${priority}, due_date = ${due_date}
      WHERE id = ${id} AND user_id = ${req.user.id}
      RETURNING *
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await sql`
      DELETE FROM tasks WHERE id = ${id} AND user_id = ${req.user.id}
      RETURNING *
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
