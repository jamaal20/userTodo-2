// Tasks API with hybrid database support
const express = require('express');
const jwt = require('jsonwebtoken');

let sql;
try {
  sql = require('@vercel/postgres');
  console.log('Vercel Postgres available');
} catch (error) {
  console.log('Vercel Postgres not available, using fallback');
}

const router = express.Router();

// Fallback storage
let fallbackTasks = [];
let taskIdCounter = 1;

// Initialize database
async function initDatabase() {
  if (!sql) {
    console.log('Using fallback storage mode for tasks');
    return;
  }

  try {
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
    console.log('Tasks database initialized successfully');
  } catch (error) {
    console.error('Tasks database initialization error, using fallback:', error.message);
  }
}

// Auth middleware
router.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get tasks
router.get('/', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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

// Initialize database
initDatabase();

module.exports = router;
