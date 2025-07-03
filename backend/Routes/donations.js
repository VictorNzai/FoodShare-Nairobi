// Handles food donation creation and related logic
const express = require('express');
const router = express.Router();
const db = require('../db'); // Assumes a db.js for MySQL connection pool


// POST /api/donations - Create a new donation
router.post('/', async (req, res) => {
  try {
    const { donor_id, category, description, quantity, unit, expiry, pickup_address, notes } = req.body;
    if (!donor_id || !category || !description || !quantity || !unit || !expiry || !pickup_address) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    const [result] = await db.execute(
      `INSERT INTO food_donations (donor_id, category, description, quantity, unit, expiry, pickup_address, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [donor_id, category, description, quantity, unit, expiry, pickup_address, notes || null]
    );
    res.status(201).json({ message: 'Donation created successfully.', donation_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/donations?donor_id=XX - List all donations for a donor
router.get('/', async (req, res) => {
  try {
    const { donor_id } = req.query;
    if (!donor_id) return res.status(400).json({ message: 'Missing donor_id' });
    const [rows] = await db.execute(
      'SELECT * FROM food_donations WHERE donor_id = ? ORDER BY created_at DESC',
      [donor_id]
    );
    res.json({ donations: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
