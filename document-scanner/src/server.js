const express = require('express');
const bodyParser = require('body-parser');
const auth = require('./auth');
const credits = require('./credits');
const scanner = require('./scanner');
const analytics = require('./analytics');

const app = express();

// Increase payload limit to 10MB (adjust as needed)
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', auth);
app.use('/api/credits', credits);
app.use('/api/scan', scanner);
app.use('/api/analytics', analytics);

// Daily credit reset
const db = require('./database.js');
function resetCredits() {
  db.run('UPDATE users SET credits = 20', (err) => {
    if (err) console.error('Reset failed:', err);
    console.log('Credits reset');
  });
  setTimeout(resetCredits, 24 * 60 * 60 * 1000);
}
resetCredits();

app.listen(3000, () => console.log('Server running on port 3000'));