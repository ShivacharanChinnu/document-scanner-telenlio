const express = require('express');
const db = require('./database.js');
const router = express.Router();

// Handle a user’s request for additional credits
router.post('/request', (req, res) => {
  const { userId, requestedCredits } = req.body;
  db.run(
    'INSERT INTO credit_requests (userId, requestedCredits) VALUES (?, ?)',
    [userId, requestedCredits],
    (err) => {
      // Check for any errors during the request submission
      if (err) return res.status(500).json({ error: 'Request failed' });
      res.json({ message: 'Request submitted' });
    }
  );
});

// Fetch all pending credit requests for admin viewing
router.get('/requests', (req, res) => {
  db.all('SELECT * FROM credit_requests WHERE status = "pending"', (err, rows) => {
    // Check for errors while retrieving pending requests
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(rows);
  });
});

// Process approving or denying a credit request by an admin
router.post('/approve', (req, res) => {
  const { requestId, status } = req.body;
  if (status === 'approved') {
    db.get('SELECT userId, requestedCredits FROM credit_requests WHERE id = ?', [requestId], (err, row) => {
      // Validate the request exists before processing
      if (err || !row) return res.status(400).json({ error: 'Invalid request' });
      db.run('UPDATE users SET credits = credits + ? WHERE id = ?', [row.requestedCredits, row.userId], (err) => {
        // Check for errors updating user credits
        if (err) return res.status(500).json({ error: 'Update failed' });
        db.run('UPDATE credit_requests SET status = ? WHERE id = ?', [status, requestId], (err) => {
          // Check for errors updating request status
          if (err) return res.status(500).json({ error: 'Status update failed' });
          res.json({ message: 'Approved' });
        });
      });
    });
  } else {
    db.run('UPDATE credit_requests SET status = "denied" WHERE id = ?', [requestId], (err) => {
      // Check for errors denying the request
      if (err) return res.status(500).json({ error: 'Deny failed' });
      res.json({ message: 'Denied' });
    });
  }
});

module.exports = router;