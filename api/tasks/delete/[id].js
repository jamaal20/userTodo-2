// Delete task endpoint
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
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'DELETE') {
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
    const { id } = req.query;
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
};
