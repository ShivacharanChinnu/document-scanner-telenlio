const express = require('express');
const db = require('./database.js');
const router = express.Router();

// Calculate similarity between two documents, prioritizing exact binary matches and falling back to filenames
function getSimilarity(content1, content2, filename1, filename2) {
  // See if the binary content of the documents is identical
  if (content1 === content2) return 1.0;
  
  // If not identical, use filename similarity as a backup, checking character overlap
  const name1 = filename1.toLowerCase().split('.').shift();
  const name2 = filename2.toLowerCase().split('.').shift();
  const common = name1.split('').filter(char => name2.includes(char)).length;
  return common / Math.max(name1.length, name2.length);
}

// Handle uploading a document, ensuring only unique content is saved
router.post('/upload', (req, res) => {
  const { userId, content, filename } = req.body;

  db.get('SELECT credits FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user || user.credits < 1) {
      return res.status(403).json({ error: 'Insufficient credits' });
    }

    // Check if this document’s content already exists in the database
    db.get('SELECT id FROM documents WHERE content = ?', [content], (err, existingDoc) => {
      if (err) {
        // Log any database errors when checking for duplicates
        console.error('DB error checking content:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (existingDoc) {
        return res.json({ docId: existingDoc.id, message: 'Document already exists' });
      }

      // Save the new document if it’s unique
      db.run(
        'INSERT INTO documents (userId, filename, content) VALUES (?, ?, ?)',
        [userId, filename, content],
        function (err) {
          if (err) {
            // Log any errors during document insertion
            console.error('DB error inserting document:', err);
            return res.status(500).json({ error: 'Upload failed' });
          }
          db.run('UPDATE users SET credits = credits - 1 WHERE id = ?', [userId], (err) => {
            // Log any errors updating user credits
            if (err) console.error('Credit deduction failed:', err);
          });
          res.json({ docId: this.lastID });
        }
      );
    });
  });
});

// Retrieve matching documents for a given document, excluding duplicates
router.get('/matches/:docId', (req, res) => {
  const { docId } = req.params;
  db.get('SELECT content, filename FROM documents WHERE id = ?', [docId], (err, doc) => {
    if (err || !doc) return res.status(404).json({ error: 'Doc not found' });

    db.all('SELECT id, filename, content FROM documents WHERE id != ?', [docId], (err, docs) => {
      if (err) return res.status(500).json({ error: 'Fetch failed' });

      const seenContent = new Set();
      const matches = docs
        .map(d => ({
          id: d.id,
          filename: d.filename,
          similarity: getSimilarity(doc.content, d.content, doc.filename, d.filename)
        }))
        .filter(m => {
          if (m.similarity > 0.3 && !seenContent.has(docs.find(doc => doc.id === m.id).content)) {
            seenContent.add(docs.find(doc => doc.id === m.id).content);
            return true;
          }
          return false;
        })
        .sort((a, b) => b.similarity - a.similarity);

      res.json(matches);
    });
  });
});

module.exports = router;