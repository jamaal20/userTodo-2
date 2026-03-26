require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Determine which database to use
const useVercelPostgres = process.env.POSTGRES_URL && process.env.POSTGRES_URL !== '';

let dbModule;
if (useVercelPostgres) {
  try {
    dbModule = require('./db-postgres');
    console.log('Using Vercel Postgres database');
  } catch (error) {
    console.log('Vercel Postgres failed, falling back to local SQLite');
    dbModule = require('./db-local');
  }
} else {
  console.log('Using local SQLite database (development mode)');
  dbModule = require('./db-local');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
dbModule.initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

// Catch-all: serve app.html for any non-API route
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ UserTodo server running at http://localhost:${PORT}`);
});
