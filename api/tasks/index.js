// Get tasks endpoint
const jwt = require('jsonwebtoken');

let sql;
try {
  sql = require('@vercel/postgres');
} catch (error) {
  console.log('Vercel Postgres not available, using fallback');
}

// Fallback storage
let fallbackTasks = [];

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    if (req.method === 'GET') {
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

      return res.json(tasks);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tasks error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};
