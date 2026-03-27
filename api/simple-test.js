// Ultra-simple test to isolate the issue
const express = require('express');

const app = express();

app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
});

// Simple login test
app.post('/api/auth/login', (req, res) => {
  console.log('Login request received:', req.body);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  // Always succeed for testing
  res.json({
    token: 'test-token-' + Date.now(),
    username: username
  });
});

// Simple tasks test
app.get('/api/tasks', (req, res) => {
  res.json([
    {
      id: 1,
      title: 'Test Task',
      description: 'This is a test task',
      completed: false,
      priority: 'medium',
      created_at: new Date().toISOString()
    }
  ]);
});

module.exports = app;
