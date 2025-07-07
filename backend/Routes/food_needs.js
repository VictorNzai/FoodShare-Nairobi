const express = require('express');
const router = express.Router();
const db = require('../Database/db');

// POST: Schedule a ride (pledge) for a food need 
router.post('/:id/schedule-pledge', async (req, res) => {
  console.log('Received pledge:', req.params, req.body);
  const { pickup_location, date, contact_phone, notes, donorName, donorEmail } = req.body;
  const { id } = req.params;
  if (!pickup_location || !date || !contact_phone) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }
  const sql = `UPDATE food_needs SET pickup_location = ?, date = ?, contact_phone = ?, notes = ?, status = 'Scheduled' WHERE id = ?`;
  try {
    const [result] = await db.query(sql, [pickup_location, date, contact_phone, notes, id]);
    // Lookup charity email and name from food_needs (using org_name)
    const [[foodNeed]] = await db.query('SELECT org_name FROM food_needs WHERE id = ?', [id]);
    let charityEmail = null;
    let charityName = foodNeed?.org_name || 'Charity';
    let donorNameFinal = donorName;
    let donorEmailFinal = donorEmail;
    // If donor info not provided, try to get from food_needs (if you store donor info there)
    if ((!donorNameFinal || !donorEmailFinal) && foodNeed) {
      // Example: if you store donor_name and donor_email in food_needs
      if (foodNeed.donor_name) donorNameFinal = foodNeed.donor_name;
      if (foodNeed.donor_email) donorEmailFinal = foodNeed.donor_email;
    }
    if (charityName) {
      const [[charityRow]] = await db.query('SELECT email FROM charity WHERE orgname = ?', [charityName]);
      if (charityRow && charityRow.email) charityEmail = charityRow.email;
    }
    if (charityEmail) {
      try {
        const { sendFoodNeedPledgeEmail } = require('../Utils/foodNeedPledgeEmail');
        await sendFoodNeedPledgeEmail(charityEmail, charityName, {
          pickup_location,
          date,
          contact_phone,
          notes,
          donorName: donorNameFinal || '',
          donorEmail: donorEmailFinal || ''
        });
      } catch (emailErr) {
        console.error('Failed to send pledge email:', emailErr);
      }
    }
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
