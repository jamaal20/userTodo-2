// Hybrid API - works with or without Vercel Postgres
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let sql;
try {
  sql = require('@vercel/postgres');
  console.log('Vercel Postgres available');
} catch (error) {
  console.log('Vercel Postgres not available, using fallback');
}

const app = express();

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Fallback storage (when database not available)
let fallbackUsers = [];
let fallbackTasks = [];
let userIdCounter = 1;
let taskIdCounter = 1;

// Initialize database (if available)
async function initDatabase() {
  if (!sql) {
    console.log('Using fallback storage mode');
    return;
  }

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
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error, using fallback:', error.message);
  }
}

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    database: sql ? 'postgres' : 'fallback'
  });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    let user;

    if (sql) {
      // Try database first
      try {
        const existingUsers = await sql`SELECT id FROM users WHERE username = ${username}`;
        if (existingUsers.length > 0) {
          return res.status(409).json({ error: 'Username already taken' });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const result = await sql`
          INSERT INTO users (username, password_hash) 
          VALUES (${username}, ${passwordHash}) 
          RETURNING id, username, created_at
        `;
        user = result[0];
      } catch (dbError) {
        console.log('Database error, falling back:', dbError.message);
        sql = null; // Disable database for future requests
      }
    }

    if (!sql) {
      // Use fallback storage
      const existingUser = fallbackUsers.find(u => u.username === username);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already taken' });
      }

      user = {
        id: userIdCounter++,
        username: username,
        created_at: new Date().toISOString()
      };

      fallbackUsers.push({
        ...user,
        password_hash: bcrypt.hashSync(password, 10)
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      token: token,
      username: user.username
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    let user;

    if (sql) {
      try {
        const users = await sql`SELECT * FROM users WHERE username = ${username}`;
        user = users[0];
      } catch (dbError) {
        console.log('Database error, falling back:', dbError.message);
        sql = null;
      }
    }

    if (!sql) {
      const fallbackUser = fallbackUsers.find(u => u.username === username);
      if (fallbackUser && bcrypt.compareSync(password, fallbackUser.password_hash)) {
        user = {
          id: fallbackUser.id,
          username: fallbackUser.username
        };
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({ 
      token: token,
      username: user.username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get tasks
app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    let tasks;

    if (sql) {
      try {
        tasks = await sql`
          SELECT * FROM tasks 
          WHERE user_id = ${req.user.id} 
          ORDER BY created_at DESC
        `;
      } catch (dbError) {
        console.log('Database error, falling back:', dbError.message);
        sql = null;
      }
    }

    if (!sql) {
      tasks = fallbackTasks.filter(task => task.user_id === req.user.id);
    }

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create task
app.post('/api/tasks', authenticate, async (req, res) => {
  try {
    const { title, description = '', priority = 'medium', due_date = null } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let task;

    if (sql) {
      try {
        const result = await sql`
          INSERT INTO tasks (user_id, title, description, priority, due_date)
          VALUES (${req.user.id}, ${title.trim()}, ${description.trim()}, ${priority}, ${due_date})
          RETURNING *
        `;
        task = result[0];
      } catch (dbError) {
        console.log('Database error, falling back:', dbError.message);
        sql = null;
      }
    }

    if (!sql) {
      task = {
        id: taskIdCounter++,
        user_id: req.user.id,
        title: title.trim(),
        description: description.trim(),
        priority: priority,
        due_date: due_date,
        completed: false,
        created_at: new Date().toISOString()
      };
      fallbackTasks.push(task);
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Delete task
app.delete('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const taskId = parseInt(id);

    if (sql) {
      try {
        const result = await sql`
          DELETE FROM tasks 
          WHERE id = ${taskId} AND user_id = ${req.user.id}
          RETURNING *
        `;
        
        if (result.length === 0) {
          return res.status(404).json({ error: 'Task not found' });
        }
      } catch (dbError) {
        console.log('Database error, falling back:', dbError.message);
        sql = null;
      }
    }

    if (!sql) {
      const taskIndex = fallbackTasks.findIndex(task => 
        task.id === taskId && task.user_id === req.user.id
      );
      
      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      fallbackTasks.splice(taskIndex, 1);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Initialize database and export
initDatabase();
module.exports = app;
