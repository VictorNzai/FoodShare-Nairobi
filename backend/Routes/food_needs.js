const express = require('express');
const router = express.Router();
const db = require('../Database/db');

// POST: Schedule a ride (pledge) for a food need 
router.post('/:id/schedule-pledge', async (req, res) => {
  console.log('Received pledge:', req.params, req.body);
  const { pickup_location, date, contact_phone, notes } = req.body;
  const { id } = req.params;
  if (!pickup_location || !date || !contact_phone) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  const sql = `UPDATE food_needs SET pickup_location = ?, date = ?, contact_phone = ?, notes = ?, status = 'Scheduled' WHERE id = ?`;
  try {
    const [result] = await db.query(sql, [pickup_location, date, contact_phone, notes, id]);
    console.log('DB update result:', result);
    res.json({ success: true });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ message: 'Database error.' });
  }
});

// Create a new food need (from donor or charity)
router.post('/', (req, res) => {
  const {
    donor_id, donor_name, charity_id, charity_name,
    food_type, description, quantity, unit, expiry, pickup_address, notes
  } = req.body;
  if (!charity_id || !food_type || !quantity || !unit) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  const sql = `INSERT INTO food_needs (
    donor_id, donor_name, charity_id, charity_name, food_type, description, quantity, unit, expiry, pickup_address, notes, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
  db.query(sql, [
    donor_id || null, donor_name || null, charity_id, charity_name, food_type, description, quantity, unit, expiry, pickup_address, notes
  ], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error.' });
    res.json({ success: true, id: result.insertId });
  });
});

// Get all food needs (optionally filter by charity)
router.get('/', (req, res) => {
  let sql = 'SELECT * FROM food_needs';
  const params = [];
  if (req.query.charity_id) {
    sql += ' WHERE charity_id = ?';
    params.push(req.query.charity_id);
  }
  sql += ' ORDER BY created_at DESC';
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' });
    res.json({ needs: results });
  });
});

module.exports = router;

// PATCH: Update food need status (e.g., mark as Completed)
router.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ message: 'Missing status in request body.' });
  }
  const sql = 'UPDATE food_needs SET status = ? WHERE id = ?';
  db.query(sql, [status, id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error.' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Food need not found.' });
    res.json({ success: true });
  });
});
