const { sql } = require('@vercel/postgres');

// Initialize database tables
async function initDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create tasks table
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        completed BOOLEAN DEFAULT FALSE,
        priority VARCHAR(20) DEFAULT 'medium',
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// User operations
async function createUser(username, passwordHash) {
  const result = await sql`
    INSERT INTO users (username, password_hash)
    VALUES (${username}, ${passwordHash})
    RETURNING id, username, created_at;
  `;
  return result.rows[0];
}

async function getUserByUsername(username) {
  const result = await sql`
    SELECT id, username, password_hash FROM users WHERE username = ${username};
  `;
  return result.rows[0];
}

async function getUserById(id) {
  const result = await sql`
    SELECT id, username, created_at FROM users WHERE id = ${id};
  `;
  return result.rows[0];
}

// Task operations
async function createTask(userId, title, description = '', priority = 'medium', dueDate = null) {
  const result = await sql`
    INSERT INTO tasks (user_id, title, description, priority, due_date)
    VALUES (${userId}, ${title}, ${description}, ${priority}, ${dueDate})
    RETURNING *;
  `;
  return result.rows[0];
}

async function getTasksByUserId(userId) {
  const result = await sql`
    SELECT * FROM tasks WHERE user_id = ${userId} ORDER BY created_at DESC;
  `;
  return result.rows;
}

async function updateTask(taskId, userId, updates) {
  const { title, description, completed, priority, dueDate } = updates;
  const result = await sql`
    UPDATE tasks 
    SET 
      title = ${title},
      description = ${description},
      completed = ${completed},
      priority = ${priority},
      due_date = ${dueDate}
    WHERE id = ${taskId} AND user_id = ${userId}
    RETURNING *;
  `;
  return result.rows[0];
}

async function deleteTask(taskId, userId) {
  const result = await sql`
    DELETE FROM tasks WHERE id = ${taskId} AND user_id = ${userId}
    RETURNING *;
  `;
  return result.rows[0];
}

module.exports = {
  initDatabase,
  createUser,
  getUserByUsername,
  getUserById,
  createTask,
  getTasksByUserId,
  updateTask,
  deleteTask
};
