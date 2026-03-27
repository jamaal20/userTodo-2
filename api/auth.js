// Authentication API with hybrid database support
const express = require('express');
const bcrypt = require('bcryptjs');
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
let fallbackUsers = [];
let userIdCounter = 1;

// Initialize database
async function initDatabase() {
  if (!sql) {
    console.log('Using fallback storage mode');
    return;
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error, using fallback:', error.message);
  }
}

// Register
router.post('/register', async (req, res) => {
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
});

// Login
router.post('/login', async (req, res) => {
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
});

// Initialize database
initDatabase();

module.exports = router;
