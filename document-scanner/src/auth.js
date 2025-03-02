const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./database.js');
const router = express.Router();

// Handle user registration with password hashing
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, hashedPassword],
    (err) => {
      // Check if the username is already taken
      if (err) return res.status(400).json({ error: 'Username taken' });
      res.json({ message: 'Registered' });
    }
  );
});

// Process user login and verify credentials
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Log the login attempt for debugging purposes
  console.log('Login attempt:', { username, password });
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      // Log any database errors
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    if (!user) {
      // Log if the user isn’t found
      console.log('User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Log the stored password hash for debugging
    console.log('Stored hash:', user.password);
    const passwordMatch = bcrypt.compareSync(password, user.password);
    // Log whether the password matches for debugging
    console.log('Password match:', passwordMatch);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ id: user.id, username: user.username, role: user.role, credits: user.credits });
  });
});

module.exports = router;