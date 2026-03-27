// Create task endpoint
const jwt = require('jsonwebtoken');

let sql;
try {
  sql = require('@vercel/postgres');
} catch (error) {
  console.log('Vercel Postgres not available, using fallback');
}

// Fallback storage
let fallbackTasks = [];
let taskIdCounter = 1;

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

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
};
