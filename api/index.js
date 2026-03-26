// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
async function initDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        completed BOOLEAN DEFAULT FALSE,
        priority VARCHAR(20) DEFAULT 'medium',
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Database initialized');
  } catch (error) {
    console.error('Database error:', error);
  }
}

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username taken' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await sql`
      INSERT INTO users (username, password_hash) 
      VALUES (${username}, ${hash}) 
      RETURNING id, username, created_at
    `;

    const token = jwt.sign(
      { id: result[0].id, username: result[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, username: result[0].username });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Credentials required' });
    }

    const users = await sql`SELECT * FROM users WHERE username = ${username}`;
    const user = users[0];
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/tasks', auth, async (req, res) => {
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

app.post('/api/tasks', auth, async (req, res) => {
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

app.put('/api/tasks/:id', auth, async (req, res) => {
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

app.delete('/api/tasks/:id', auth, async (req, res) => {
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

// Initialize and export
initDatabase();
module.exports = app;
