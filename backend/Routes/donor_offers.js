const express = require('express');
const router = express.Router();
const db = require('../Database/db'); // Adjust path if needed

// GET /api/donor-offers?donor_id=XX - List all offers for a donor
router.get('/', async (req, res) => {
  try {
    const { donor_id } = req.query;
    if (!donor_id) return res.status(400).json({ message: 'Missing donor_id' });
    const [rows] = await db.query(
      'SELECT * FROM donor_offers WHERE donor_id = ? ORDER BY created_at DESC',
      [donor_id]
    );
    res.json({ offers: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/donor-offers - Donor submits a food offer to a charity
router.post('/', async (req, res) => {
  try {
    const {
      donor_id,
      donor_name,
      charity_id,
      charity_name,
      food_type,
      description,
      quantity,
      unit,
      expiry,
      pickup_address,
      notes
    } = req.body;
    if (!donor_id || !donor_name || !charity_id || !charity_name || !food_type || !description || !quantity || !unit || !expiry || !pickup_address) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    const sql = `INSERT INTO donor_offers (
      donor_id, donor_name, charity_id, charity_name, food_type, description, quantity, unit, expiry, pickup_address, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await db.query(sql, [
      donor_id,
      donor_name,
      charity_id,
      charity_name,
      food_type,
      description,
      quantity,
      unit,
      expiry,
      pickup_address,
      notes || ''
    ]);
    res.json({ success: true, message: 'Offer submitted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/donor-offers/:charity_id - Charity fetches all offers made to them
router.get('/:charity_id', async (req, res) => {
  try {
    const { charity_id } = req.params;
    const sql = `SELECT * FROM donor_offers WHERE charity_id = ? ORDER BY created_at DESC`;
    const [offers] = await db.query(sql, [charity_id]);
    res.json({ success: true, offers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PATCH /api/donor-offers/:offer_id - Charity accepts or denies an offer
router.patch('/:offer_id', async (req, res) => {
  try {
    const { offer_id } = req.params;
    const { status } = req.body;
    if (!['accepted', 'denied'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const sql = `UPDATE donor_offers SET status = ? WHERE id = ?`;
    await db.query(sql, [status, offer_id]);
    res.json({ success: true, message: `Offer ${status}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
