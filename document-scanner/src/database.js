const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Set up the path for the SQLite database file
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    // Log any errors connecting to the database and exit
    console.error('DB Error:', err);
    process.exit(1);
  }
  // Let us know the database connection was successful
  console.log('Connected to SQLite at:', dbPath);
});

db.serialize(() => {
  // Create the users table if it doesn’t exist
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user',
      credits INTEGER DEFAULT 20
    )
  `);
  // Create the documents table if it doesn’t exist
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      filename TEXT,
      content TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Create the credit_requests table if it doesn’t exist
  db.run(`
    CREATE TABLE IF NOT EXISTS credit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      requestedCredits INTEGER,
      status TEXT DEFAULT 'pending'
    )
  `);

  // Look for existing users to decide whether to seed admins
  console.log('Checking for existing users...');
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) {
      // Log any issues counting users
      console.error('Count check failed:', err);
      return;
    }
    // Show how many users are already in the database
    console.log('User count:', row.count);
    if (row.count === 0) {
      const admins = [
        { username: 'admin1', password: 'admin1pass', role: 'admin', credits: 20 },
        { username: 'admin2', password: 'admin2pass', role: 'admin', credits: 20 },
        { username: 'admin3', password: 'admin3pass', role: 'admin', credits: 20 }
      ];
      admins.forEach(({ username, password, role, credits }) => {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.run(
          'INSERT INTO users (username, password, role, credits) VALUES (?, ?, ?, ?)',
          [username, hashedPassword, role, credits],
          (err) => {
            if (err) console.error(`Failed to seed ${username}:`, err);
            else console.log(`Admin created: ${username}/${password}`);
          }
        );
      });
    } else {
      // Skip seeding if users already exist
      console.log('Users already exist, skipping admin seeding.');
    }
  });
});

module.exports = db;