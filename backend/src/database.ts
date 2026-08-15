import { createClient } from "@libsql/client";
import fs from "fs";

// Database Configuration
// Supports two modes (choose one):
//
// Option A - Local SQLite (recommended for on-premises / UAT):
//   Set DATABASE_URL=file:/app/data/foodrate.db
//   The database file is stored locally, no cloud dependency.
//
// Option B - Turso Cloud (for production deployments):
//   Set TURSO_URL=libsql://your-database.turso.io
//   Set TURSO_AUTH_TOKEN=your-token-here

function createDatabaseClient() {
  // Local SQLite mode
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl.startsWith("file:")) {
      const dbPath = dbUrl.replace("file:", "");
      const dir = dbPath.substring(0, dbPath.lastIndexOf("/"));
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return createClient({ url: dbUrl });
    }
  }

  // Turso Cloud mode
  if (process.env.TURSO_URL && process.env.TURSO_AUTH_TOKEN) {
    return createClient({
      url: process.env.TURSO_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  throw new Error(
    "No database configuration found. " +
      'Set DATABASE_URL (e.g., "file:/app/data/foodrate.db") for local SQLite, ' +
      "or set TURSO_URL and TURSO_AUTH_TOKEN for Turso cloud.",
  );
}

const db = createDatabaseClient();

async function initializeDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      street TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      country TEXT,
      latitude REAL,
      longitude REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS food_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      notes TEXT,
      family_member_id INTEGER NOT NULL,
      place_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_member_id) REFERENCES family_members(id),
      FOREIGN KEY (place_id) REFERENCES places(id)
    );
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_ratings_member
    ON food_ratings(family_member_id);
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_ratings_food
    ON food_ratings(food_name);
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_ratings_place
    ON food_ratings(place_id);
  `);

  // Add place_id column to food_ratings if it doesn't exist (migration)
  try {
    await db.execute(`
      ALTER TABLE food_ratings ADD COLUMN place_id INTEGER REFERENCES places(id);
    `);
  } catch (error: any) {
    // Column already exists, ignore
  }

  // Add new address columns to places if they don't exist (migration)
  const newAddressColumns = ["street", "city", "state", "zip", "country"];

  for (const column of newAddressColumns) {
    try {
      await db.execute(`
        ALTER TABLE places ADD COLUMN ${column} TEXT;
      `);
    } catch (error: any) {
      // Column already exists, ignore
    }
  }
}

export { db, initializeDatabase };
