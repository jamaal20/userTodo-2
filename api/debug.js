// Debug version to isolate the issue
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Simple test endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

app.post('/api/test', (req, res) => {
  console.log('Request body:', req.body);
  res.json({ 
    message: 'Test endpoint working',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

// Basic auth test without database
app.post('/api/auth/login', (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Credentials required' });
    }
    
    // Mock successful response for testing
    res.json({ 
      message: 'Login endpoint working',
      username,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login error', details: error.message });
  }
});

app.post('/api/auth/register', (req, res) => {
  try {
    console.log('Register attempt:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password too short' });
    }
    
    // Mock successful response for testing
    res.status(201).json({ 
      message: 'Register endpoint working',
      username,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Register error', details: error.message });
  }
});

module.exports = app;
