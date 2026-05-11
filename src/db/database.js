import * as SQLite from 'expo-sqlite';

const dbName = 'due_reminders_final_v2.db';

let databaseInstance = null;
let initPromise = null; // Ensures only ONE openDatabaseAsync call ever runs

export const initDatabase = async () => {
  // If already open, return immediately
  if (databaseInstance) return databaseInstance;

  // If init is in progress (another caller beat us here), wait for it
  if (initPromise) return initPromise;

  // We are first — start the init and share the promise
  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(dbName);
    databaseInstance = db;

    await db.execAsync('PRAGMA journal_mode = WAL;');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        amount REAL DEFAULT 0,
        currency TEXT DEFAULT '$',
        due_at INTEGER NOT NULL,
        nag_interval INTEGER DEFAULT 5,
        category TEXT DEFAULT 'general',
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL
      );
    `);

    // Migration for existing tables
    try {
      await db.execAsync('ALTER TABLE tasks ADD COLUMN amount REAL DEFAULT 0;');
    } catch (e) {}

    try {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN currency TEXT DEFAULT '$';");
      console.log('[Noir] Database migrated: Added currency column.');
    } catch (e) {
      // Column might already exist
    }

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS timers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        duration INTEGER NOT NULL,
        remaining INTEGER NOT NULL,
        end_at INTEGER,
        created_at INTEGER NOT NULL
      );
    `);

    console.log('Database initialized successfully');
    return db;
  })();

  return initPromise;
};

// getDb always waits for init to finish before returning
export const getDb = async () => {
  if (databaseInstance) return databaseInstance;
  return initDatabase();
};
