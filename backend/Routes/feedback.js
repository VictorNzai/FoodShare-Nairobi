const express = require('express');
const router = express.Router();
const db = require('../db');

// Submit feedback
router.post('/', async (req, res) => {
  try {
    const { donor_id, comment, rating, category } = req.body;
    if (!donor_id || !comment) {
      return res.status(400).json({ error: 'Missing donor_id or comment' });
    }
    await db.query(
      'INSERT INTO feedback (donor_id, comment, rating, category) VALUES (?, ?, ?, ?)',
      [donor_id, comment, rating || null, category || null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// (Optional) Get feedback for admin or donor
router.get('/', async (req, res) => {
  try {
    const { donor_id } = req.query;
    let rows;
    if (donor_id) {
      [rows] = await db.query('SELECT * FROM feedback WHERE donor_id = ? ORDER BY created_at DESC', [donor_id]);
    } else {
      [rows] = await db.query('SELECT * FROM feedback ORDER BY created_at DESC');
    }
    res.json({ feedback: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

module.exports = router;
