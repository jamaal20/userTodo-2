const { sql } = require('@vercel/postgres');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

// Check if we're in a Vercel environment with a Postgres URL
const usePostgres = process.env.POSTGRES_URL && process.env.NODE_ENV === 'production';

if (usePostgres) {
  console.log('Using Vercel Postgres');
  db = {
    query: async (text, params) => {
      // Simple wrapper to mimic tagged template literal behavior or standard query
      if (typeof text === 'string') {
        const result = await sql.query(text, params);
        return result.rows;
      }
      return await sql(text, ...params);
    },
    // For tagged template literals - wrap to return rows directly
    sql: async (strings, ...values) => {
      const result = await sql(strings, ...values);
      return result.rows;
    }
  };
} else {
  console.log('Using local SQLite fallback');
  const dbPath = path.join(process.cwd(), 'todo.db');
  
  let sqlite;
  try {
    sqlite = new Database(dbPath);
    console.log('SQLite database connected at:', dbPath);
  } catch (err) {
    console.error('Failed to connect to SQLite:', err);
    process.exit(1);
  }
  
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
  
  db = {
    query: async (text, params = []) => {
      // Convert Postgres-style $1, $2 to SQLite-style ?
      let sqliteQuery = text;
      if (typeof text === 'string') {
        sqliteQuery = text.replace(/\$(\d+)/g, '?');
        const stmt = sqlite.prepare(sqliteQuery);
        if (sqliteQuery.trim().toUpperCase().startsWith('SELECT')) {
          return stmt.all(...params);
        } else {
          const result = stmt.run(...params);
          return [result];
        }
      }
      return []; // Not supporting tagged template literals for SQLite in this simple wrapper
    },
    // Tagged template literal fallback for SQLite (basic version)
    sql: async (strings, ...values) => {
      let query = '';
      strings.forEach((string, i) => {
        query += string + (i < values.length ? '?' : '');
      });
      
      console.log('DB Query:', query, 'Values:', values);
      try {
        const stmt = sqlite.prepare(query);
        if (query.trim().toUpperCase().startsWith('SELECT')) {
          const rows = stmt.all(...values);
          console.log('DB Select Result count:', rows.length);
          return rows;
        } else {
          const result = stmt.run(...values);
          console.log('DB Exec Result:', result);
          // Mimic RETURNING * for INSERT
          if (query.trim().toUpperCase().startsWith('INSERT')) {
              const lastInsertRowid = result.lastInsertRowid;
              const matches = query.match(/INSERT INTO (\w+)/i);
              const tableName = matches ? matches[1] : null;
              if (tableName) {
                  return sqlite.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).all(lastInsertRowid);
              }
          }
          return [result];
        }
      } catch (err) {
        console.error('DB Error:', err);
        throw err;
      }
    }
  };
}

module.exports = db;
