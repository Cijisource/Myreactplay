const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/ecommerce.db');
const dataDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database at:', dbPath);
});

// Initialize database schema
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // Read schema file
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    let completed = 0;
    statements.forEach((statement, index) => {
      db.run(statement + ';', (err) => {
        if (err) {
          console.error(`Error executing schema statement ${index}:`, err.message);
          reject(err);
        }
        completed++;
        if (completed === statements.length) {
          console.log('Database schema initialized successfully');
          
          // Add sample data if tables are empty
          addSampleData().then(resolve).catch(reject);
        }
      });
    });
  });
};

const addSampleData = () => {
  return new Promise((resolve, reject) => {
    // Check if categories table is empty
    db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
      if (err) {
        console.error('Error checking categories:', err);
        reject(err);
        return;
      }
      
      if (row.count === 0) {
        const seedPath = path.join(__dirname, '../../database/seed.sql');
        const seed = fs.readFileSync(seedPath, 'utf8');
        const statements = seed.split(';').filter(stmt => stmt.trim().length > 0);
        
        let completed = 0;
        statements.forEach((statement, index) => {
          db.run(statement + ';', (err) => {
            if (err) {
              console.error(`Error executing seed statement ${index}:`, err.message);
            }
            completed++;
            if (completed === statements.length) {
              console.log('Sample data added successfully');
              resolve();
            }
          });
        });
      } else {
        console.log('Database already contains data');
        resolve();
      }
    });
  });
};

// Run initialization on startup
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = db;
