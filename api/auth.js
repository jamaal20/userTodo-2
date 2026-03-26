const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('@vercel/postgres');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username taken' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await sql`
      INSERT INTO users (username, password_hash) 
      VALUES (${username}, ${hash}) 
      RETURNING id, username, created_at
    `;

    const token = jwt.sign(
      { id: result[0].id, username: result[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, username: result[0].username });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Credentials required' });
    }

    const users = await sql`SELECT * FROM users WHERE username = ${username}`;
    const user = users[0];
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
