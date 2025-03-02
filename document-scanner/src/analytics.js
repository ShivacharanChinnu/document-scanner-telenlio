const express = require('express');
const db = require('./database.js');
const router = express.Router();

// Fetch and return analytics data for the admin dashboard
router.get('/', (req, res) => {
  const stats = {};
  db.all('SELECT username, credits FROM users', (err, users) => {
    // Check for errors while fetching user data
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    stats.users = users;
    db.all('SELECT userId, COUNT(*) as scans FROM documents GROUP BY userId', (err, scans) => {
      // Check for errors while fetching scan data
      if (err) return res.status(500).json({ error: 'Fetch failed' });
      stats.scans = scans;
      res.json(stats);
    });
  });
});

module.exports = router;