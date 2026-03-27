const { sql } = require('@vercel/postgres');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

// Check if we're in a Vercel environment with a Postgres URL
// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION;
const usePostgres = process.env.POSTGRES_URL && (process.env.NODE_ENV === 'production' || isVercel);

if (usePostgres) {
  console.log('Using Vercel Postgres');
  db = {
    query: async (text, params) => {
      try {
        if (typeof text === 'string') {
          const result = await sql.query(text, params);
          return result.rows;
        }
        return await sql(text, ...params);
      } catch (err) {
        console.error('Postgres Query Error:', err);
        throw err;
      }
    },
    // For tagged template literals - wrap to return rows directly
    sql: async (strings, ...values) => {
      try {
        const result = await sql(strings, ...values);
        // @vercel/postgres 'sql' returns an object with 'rows'
        return result.rows || [];
      } catch (err) {
        console.error('Postgres SQL Error:', err);
        throw err;
      }
    }
  };
} else {
  console.log('Using local SQLite fallback');
  const dbPath = isVercel ? '/tmp/todo.db' : path.join(process.cwd(), 'todo.db');
  
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
    // On Vercel, if we reach here without Postgres, we're in trouble.
    // We export a dummy object that throws errors when used, instead of crashing the module load.
    db = {
      query: () => { throw new Error('Database not configured. Please add POSTGRES_URL to Vercel environment variables.'); },
      sql: () => { throw new Error('Database not configured. Please add POSTGRES_URL to Vercel environment variables.'); }
    };
  }
  
  if (!db) {
    db = {
      query: async (text, params = []) => {
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
        return [];
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
  }
}

module.exports = db;
