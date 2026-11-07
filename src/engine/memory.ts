/**
 * Supergravity Persistent Memory Engine
 * Powered by built-in node:sqlite for lightning-fast zero-dependency storage
 */

import { DatabaseSync } from 'node:sqlite';
import * as path from 'node:path';
import * as fs from 'node:fs';

export class MemoryEngine {
  private db: DatabaseSync;

  constructor(storageDir: string = '.supergravity') {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const dbPath = path.join(storageDir, 'state.db');
    this.db = new DatabaseSync(dbPath);
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at INTEGER,
        title TEXT,
        status TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        role TEXT,
        content TEXT,
        timestamp INTEGER
      );

      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        title TEXT,
        status TEXT,
        data TEXT,
        timestamp INTEGER
      );

      CREATE TABLE IF NOT EXISTS project_memory (
        key TEXT PRIMARY KEY,
        value TEXT,
        category TEXT,
        updated_at INTEGER
      );
    `);
  }

  createSession(id: string, title: string = 'New Conversation') {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO sessions (id, created_at, title, status) VALUES (?, ?, ?, ?)');
    stmt.run(id, Date.now(), title, 'active');
  }

  saveMessage(sessionId: string, role: string, content: string) {
    const stmt = this.db.prepare('INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)');
    stmt.run(sessionId, role, content, Date.now());
  }

  getMessages(sessionId: string): Array<{ role: string; content: string; timestamp: number }> {
    const stmt = this.db.prepare('SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY id ASC');
    return stmt.all(sessionId) as any;
  }

  setMemory(key: string, value: string, category: string = 'general') {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO project_memory (key, value, category, updated_at) VALUES (?, ?, ?, ?)');
    stmt.run(key, value, category, Date.now());
  }

  getMemory(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM project_memory WHERE key = ?');
    const row = stmt.get(key) as any;
    return row ? row.value : null;
  }

  getAllMemory(): Array<{ key: string; value: string; category: string }> {
    const stmt = this.db.prepare('SELECT key, value, category FROM project_memory ORDER BY updated_at DESC');
    return stmt.all() as any;
  }

  close() {
    try {
      this.db.close();
    } catch {}
  }
}
