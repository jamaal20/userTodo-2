const db = require('../../lib/db');
const auth = require('../../middleware/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Authentication
  let authenticated = false;
  await auth(req, res, () => { authenticated = true; });
  if (!authenticated) return;

  try {
    const { title, description = '', priority = 'medium', due_date = null } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await db.sql`
      INSERT INTO tasks (user_id, title, description, priority, due_date)
      VALUES (${req.user.id}, ${title.trim()}, ${description.trim()}, ${priority}, ${due_date})
    `;
    
    // INSERT returns the new record
    const task = result[0];
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};
