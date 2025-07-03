// Add endpoints for updating status and assigning charity to a donation
const express = require('express');
const router = express.Router();
const db = require('../db');

// ...existing code...

// PATCH /api/donations/:id/status - Update donation status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    if (!status) return res.status(400).json({ message: 'Missing status' });
    const [result] = await db.execute(
      'UPDATE food_donations SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Donation not found' });
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/donations/:id/assign-charity - Assign a charity to a donation
router.patch('/:id/assign-charity', async (req, res) => {
  try {
    const { charity_id } = req.body;
    const { id } = req.params;
    if (!charity_id) return res.status(400).json({ message: 'Missing charity_id' });
    const [result] = await db.execute(
      'UPDATE food_donations SET charity_id = ?, updated_at = NOW() WHERE id = ?',
      [charity_id, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Donation not found' });
    res.json({ message: 'Charity assigned' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
