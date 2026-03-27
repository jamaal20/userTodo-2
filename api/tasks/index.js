const db = require('../../lib/db');
const auth = require('../../middleware/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Authentication
  // We call our middleware manually to keep the function compatible with Vercel's standalone execution
  let authenticated = false;
  await auth(req, res, () => { authenticated = true; });
  if (!authenticated) return; // auth middleware already sent 401 response

  try {
    if (req.method === 'GET') {
      const tasks = await db.sql`
        SELECT * FROM tasks 
        WHERE user_id = ${req.user.id} 
        ORDER BY created_at DESC
      `;
      return res.json(tasks);
    }

    if (req.method === 'PUT') {
        const id = req.query.id || req.body.id || (req.url.split('/').pop());
        const { title, description, priority, completed, due_date } = req.body;
        
        await db.sql`
          UPDATE tasks 
          SET title = ${title}, description = ${description}, priority = ${priority}, 
              completed = ${completed ? 1 : 0}, due_date = ${due_date}
          WHERE id = ${id} AND user_id = ${req.user.id}
        `;
        
        const updated = await db.sql`SELECT * FROM tasks WHERE id = ${id}`;
        return res.json(updated[0]);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tasks error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};
