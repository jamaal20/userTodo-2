const db = require('../../../lib/db');
const auth = require('../../../middleware/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  // Vercel routes are usually specific, but for safety:
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  // Authentication
  let authenticated = false;
  await auth(req, res, () => { authenticated = true; });
  if (!authenticated) return;

  try {
    const id = req.query.id || req.params.id;
    
    if (!id) {
      return res.status(400).json({ error: 'Task ID required' });
    }

    // Delete task and ensure it belongs to the user
    await db.sql`
      DELETE FROM tasks 
      WHERE id = ${id} AND user_id = ${req.user.id}
    `;

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
