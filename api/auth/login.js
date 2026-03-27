// Login endpoint
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let sql;
try {
  sql = require('@vercel/postgres');
} catch (error) {
  console.log('Vercel Postgres not available, using fallback');
}

// Fallback storage (shared with register)
let fallbackUsers = [];

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
};
