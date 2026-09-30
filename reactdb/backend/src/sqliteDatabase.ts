import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const isDocker = process.env.NODE_ENV === 'production';

// Toggle: set TENANT_STORAGE_ENGINE=sqlite to store Tenant Management data locally
// instead of the primary Azure SQL database. Defaults to the primary database.
export const isSqliteTenantStorage = (): boolean =>
  (process.env.TENANT_STORAGE_ENGINE || 'mssql').trim().toLowerCase() === 'sqlite';

const sqliteDbPath = process.env.SQLITE_DB_PATH ||
  (isDocker ? '/app/data/tenants.sqlite' : path.resolve(process.cwd(), 'data', 'tenants.sqlite'));

let db: Database.Database | null = null;

export function initializeSqliteDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dir = path.dirname(sqliteDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(sqliteDbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS Tenant (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Phone TEXT NOT NULL,
      Address TEXT,
      City TEXT,
      PhotoUrl TEXT, Photo2Url TEXT, Photo3Url TEXT, Photo4Url TEXT, Photo5Url TEXT,
      Photo6Url TEXT, Photo7Url TEXT, Photo8Url TEXT, Photo9Url TEXT, Photo10Url TEXT,
      Proof1Url TEXT, Proof2Url TEXT, Proof3Url TEXT, Proof4Url TEXT, Proof5Url TEXT,
      Proof6Url TEXT, Proof7Url TEXT, Proof8Url TEXT, Proof9Url TEXT, Proof10Url TEXT
    );

    CREATE TABLE IF NOT EXISTS Occupancy (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      TenantId INTEGER NOT NULL REFERENCES Tenant(Id) ON DELETE CASCADE,
      RoomId INTEGER NOT NULL,
      CheckInDate TEXT,
      CheckOutDate TEXT,
      CreatedDate TEXT,
      UpdatedDate TEXT,
      RentFixed REAL,
      DepositReceived REAL,
      DepositRefunded REAL,
      Charges TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sqlite_occupancy_tenant ON Occupancy(TenantId);
    CREATE INDEX IF NOT EXISTS idx_sqlite_occupancy_room ON Occupancy(RoomId);
  `);

  console.log(`[SQLite] Tenant local storage initialized at ${sqliteDbPath}`);
  return db;
}

export function getSqliteDb(): Database.Database {
  if (!db) {
    throw new Error('SQLite database not initialized. Call initializeSqliteDatabase() first.');
  }
  return db;
}

export function closeSqliteDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('✓ SQLite tenant database connection closed');
  }
}
