const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();

// Determine which database to use
const useVercelPostgres = process.env.POSTGRES_URL && process.env.POSTGRES_URL !== '';

let getUserByUsername, createUser;
if (useVercelPostgres) {
  try {
    const postgres = require('../db-postgres');
    getUserByUsername = postgres.getUserByUsername;
    createUser = postgres.createUser;
    console.log('Using Vercel Postgres for auth');
  } catch (error) {
    const local = require('../db-local');
    getUserByUsername = local.getUserByUsername;
    createUser = local.createUser;
    console.log('Using local SQLite for auth');
  }
} else {
  const local = require('../db-local');
  getUserByUsername = local.getUserByUsername;
  createUser = local.createUser;
  console.log('Using local SQLite for auth');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const user = await createUser(username, hash);

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, username: user.username });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await getUserByUsername(username);
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
