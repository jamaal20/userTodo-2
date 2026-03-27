// Debug version with proper JWT responses and security headers
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// Security headers to prevent Chrome warnings
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Simple test endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
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

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Mock tasks storage (in production, use database)
let mockTasks = [
  {
    id: 1,
    user_id: 1,
    title: 'Sample Task',
    description: 'This is a sample task',
    completed: false,
    priority: 'medium',
    created_at: new Date().toISOString()
  }
];

let taskIdCounter = 2;

// Get tasks (with authentication)
app.get('/api/tasks', authenticate, (req, res) => {
  const userTasks = mockTasks.filter(task => task.user_id === req.user.id);
  res.json(userTasks);
});

// Create task (with authentication)
app.post('/api/tasks', authenticate, (req, res) => {
  try {
    const { title, description = '', priority = 'medium' } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title required' });
    }
    
    const newTask = {
      id: taskIdCounter++,
      user_id: req.user.id,
      title: title.trim(),
      description: description.trim(),
      completed: false,
      priority,
      created_at: new Date().toISOString()
    };
    
    mockTasks.push(newTask);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task (with authentication)
app.delete('/api/tasks/:id', authenticate, (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const taskIndex = mockTasks.findIndex(task => 
      task.id === taskId && task.user_id === req.user.id
    );
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    mockTasks.splice(taskIndex, 1);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = app;
