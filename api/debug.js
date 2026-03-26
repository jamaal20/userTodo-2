// Debug version with proper JWT responses
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

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

// Basic auth test with proper JWT response
app.post('/api/auth/login', (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Credentials required' });
    }
    
    // Create a mock JWT token (in real app, verify against database)
    const token = jwt.sign(
      { id: 1, username: username }, // Mock user ID
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );
    
    // Return the exact format the frontend expects
    res.json({ 
      token: token,
      username: username
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
    
    // Create a mock JWT token
    const token = jwt.sign(
      { id: 1, username: username }, // Mock user ID
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );
    
    // Return the exact format the frontend expects
    res.status(201).json({ 
      token: token,
      username: username
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Register error', details: error.message });
  }
});

// Mock tasks endpoint
app.get('/api/tasks', (req, res) => {
  // This would normally require auth middleware
  res.json([
    {
      id: 1,
      title: 'Sample Task',
      description: 'This is a sample task',
      completed: false,
      priority: 'medium',
      created_at: new Date().toISOString()
    }
  ]);
});

module.exports = app;
