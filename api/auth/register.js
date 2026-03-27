// Register endpoint
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let sql;
try {
  sql = require('@vercel/postgres');
} catch (error) {
  console.log('Vercel Postgres not available, using fallback');
}

// Fallback storage
let fallbackUsers = [];
let userIdCounter = 1;

// Initialize database
async function initDatabase() {
  if (!sql) return;
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
  } catch (error) {
    console.error('Database initialization error, using fallback:', error.message);
  }
}

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
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    let user;

    if (sql) {
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
        sql = null;
      }
    }

    if (!sql) {
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
};

// Initialize database
initDatabase();
