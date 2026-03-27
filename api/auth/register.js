const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../lib/db');

module.exports = async (req, res) => {
  // CORS (handled by app.js in local dev, but for Vercel)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  console.log('Register request received for:', req.body.username);
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUsers = await db.sql`SELECT id FROM users WHERE username = ${username}`;
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await db.sql`
      INSERT INTO users (username, password_hash) 
      VALUES (${username}, ${passwordHash})
      RETURNING *
    `;
    
    // In our db.sql wrapper, INSERT returns the new record
    const user = result[0];

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
};
