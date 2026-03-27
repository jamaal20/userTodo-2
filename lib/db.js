const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../todo.db');
let sqlite;

try {
  sqlite = new Database(dbPath);
  console.log('SQLite database connected at:', dbPath);
  
  // Initialize SQLite tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      completed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);
} catch (err) {
  console.error('Failed to connect to SQLite:', err);
  throw err;
}

const db = {
  query: async (text, params = []) => {
    try {
      // Replace $1, $2 with ? for SQLite
      const sqliteQuery = text.replace(/\$(\d+)/g, '?');
      const stmt = sqlite.prepare(sqliteQuery);
      
      if (sqliteQuery.trim().toUpperCase().startsWith('SELECT')) {
        return stmt.all(...params);
      } else {
        const result = stmt.run(...params);
        return [result];
      }
    } catch (err) {
      console.error('SQLite Query Error:', err);
      throw err;
    }
  },
  
  sql: async (strings, ...values) => {
    let query = '';
    strings.forEach((string, i) => {
      query += string + (i < values.length ? '?' : '');
    });
    
    // Strip RETURNING * for SQLite compatibility if present
    const cleanQuery = query.replace(/RETURNING \*/gi, '').trim();
    
    try {
      const stmt = sqlite.prepare(cleanQuery);
      if (cleanQuery.toUpperCase().startsWith('SELECT')) {
        return stmt.all(...values);
      } else {
        const result = stmt.run(...values);
        
        // Mimic RETURNING * behavior for INSERT
        if (cleanQuery.toUpperCase().startsWith('INSERT')) {
          const lastInsertRowid = result.lastInsertRowid;
          const matches = cleanQuery.match(/INSERT INTO (\w+)/i);
          const tableName = matches ? matches[1] : null;
          if (tableName) {
            return sqlite.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).all(lastInsertRowid);
          }
        }
        return [result];
      }
    } catch (err) {
      console.error('SQLite SQL Error:', err);
      throw err;
    }
  }
};

module.exports = db;
