const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes - manually mapping to match serverless functions
// Auth
app.all('/api/auth/register', async (req, res) => {
  await require('./api/auth/register')(req, res);
});

app.all('/api/auth/login', async (req, res) => {
  await require('./api/auth/login')(req, res);
});

// Tasks
app.all('/api/tasks', async (req, res) => {
  await require('./api/tasks/index')(req, res);
});

app.all('/api/tasks/create', async (req, res) => {
  await require('./api/tasks/create')(req, res);
});

// Support both path params and query params for tasks
app.all('/api/tasks/:id', async (req, res) => {
  req.query = { ...req.query, id: req.params.id };
  await require('./api/tasks/index')(req, res);
});

// Dynamic route for delete
app.all('/api/tasks/delete/:id', async (req, res) => {
  // Map :id to req.query.id to match the serverless function expectations
  req.query = { ...req.query, id: req.params.id };
  await require('./api/tasks/delete/[id]')(req, res);
});

// Fallback for other /api routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
