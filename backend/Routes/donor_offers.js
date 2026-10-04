const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../Database/db'); // Adjust path if needed
const { notify, LINKS } = require('../Utils/notify');

// The pickup code belongs to the donor; the charity only learns it at handover
const withoutCode = ({ pickup_code, ...offer }) => offer;

// GET /api/donor-offers/all - List all donor offers (for admin/overview)
router.get('/all', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM donor_offers ORDER BY created_at DESC');
    res.json({ success: true, offers: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

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
    await notify('charity', charity_id, `${donor_name} offered ${quantity} ${unit} of ${food_type}.`, LINKS.charityOffers);
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
    // Pending offers first, the soonest to expire at the top
    const sql = `SELECT * FROM donor_offers WHERE charity_id = ?
      ORDER BY (status = 'Pending') DESC, CASE WHEN status = 'Pending' THEN expiry END ASC, created_at DESC`;
    const [offers] = await db.query(sql, [charity_id]);
    res.json({ success: true, offers: offers.map(withoutCode) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});


// POST /api/donor-offers/:offer_id/accept - Charity accepts an offer and sets the pickup time
// Body: { pickup_at: "YYYY-MM-DDTHH:MM" }. The donor gets a code to hand over at pickup.
router.post('/:offer_id/accept', async (req, res) => {
  try {
    const { offer_id } = req.params;
    const { pickup_at } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(pickup_at || '')) {
      return res.status(400).json({ success: false, message: 'Choose a pickup date and time.' });
    }
    const code = String(crypto.randomInt(100000, 1000000));
    const sql = `UPDATE donor_offers SET status = 'Scheduled', pickup_at = ?, pickup_code = ? WHERE id = ? AND status = 'Pending'`;
    const [result] = await db.query(sql, [pickup_at, code, offer_id]);
    if (!result.affectedRows) {
      return res.status(409).json({ success: false, message: 'This offer is no longer pending.' });
    }
    const [[offer]] = await db.query('SELECT donor_id, charity_name, food_type FROM donor_offers WHERE id = ?', [offer_id]);
    await notify(
      'donor',
      offer.donor_id,
      `${offer.charity_name} accepted your ${offer.food_type} offer. Pickup: ${pickup_at.replace('T', ' ')}. Your pickup code is in the donation's details.`,
      LINKS.donorDonations
    );
    res.json({ success: true, message: 'Offer scheduled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/donor-offers/:offer_id/deny - Charity turns down an offer (set status to Denied)
router.post('/:offer_id/deny', async (req, res) => {
  try {
    const { offer_id } = req.params;
    const sql = `UPDATE donor_offers SET status = 'Denied' WHERE id = ?`;
    await db.query(sql, [offer_id]);
    const [[offer]] = await db.query('SELECT donor_id, charity_name, food_type FROM donor_offers WHERE id = ?', [offer_id]);
    if (offer) {
      await notify('donor', offer.donor_id, `${offer.charity_name} could not take your ${offer.food_type} offer.`, LINKS.donorDonations);
    }
    res.json({ success: true, message: 'Offer denied.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/donor-offers/:offer_id/arrived - Charity confirms the handover (status = Completed)
// Body: { code, people_fed }. The code is the one the donor was given on acceptance.
router.post('/:offer_id/arrived', async (req, res) => {
  try {
    const { offer_id } = req.params;
    const { code, people_fed } = req.body || {};
    const [[offer]] = await db.query(
      'SELECT donor_id, charity_name, food_type, pickup_code FROM donor_offers WHERE id = ?',
      [offer_id]
    );
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });
    // Offers accepted before pickup codes existed have none, and complete without one.
    // ponytail: no limit on wrong attempts; add one together with server-side login.
    if (offer.pickup_code && String(code || '').trim() !== offer.pickup_code) {
      return res.status(400).json({ success: false, message: 'That pickup code is not correct.' });
    }
    const fed = Number.parseInt(people_fed, 10);
    const sql = `UPDATE donor_offers SET status = 'Completed', completed_at = NOW(), people_fed = ? WHERE id = ?`;
    await db.query(sql, [fed >= 0 ? fed : null, offer_id]);
    await notify(
      'donor',
      offer.donor_id,
      `${offer.charity_name} collected your ${offer.food_type} donation.${fed > 0 ? ` It helped feed ${fed} people.` : ''} Thank you!`,
      LINKS.donorDonations
    );
    res.json({ success: true, message: 'Offer marked as completed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/donor-offers/offer/:id - Get a single offer by its ID
router.get('/offer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM donor_offers WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Offer not found.' });
    }
    res.json({ success: true, offer: withoutCode(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/donor-offers/stats/food-sum - Get total quantity of food donated and offered by a donor
router.get('/stats/food-sum', async (req, res) => {
  const donorId = req.query.donor_id;
  if (!donorId) return res.status(400).json({ success: false, message: 'Missing donor_id' });
  try {
    // Get sum from food_donations
    const [donationRows] = await db.query(
      'SELECT SUM(quantity) AS total_quantity FROM food_donations WHERE donor_id = ?',
      [donorId]
    );
    // Get sum from donor_offers
    const [offerRows] = await db.query(
      'SELECT SUM(quantity) AS total_quantity FROM donor_offers WHERE donor_id = ?',
      [donorId]
    );
    const donationSum = parseFloat(donationRows[0]?.total_quantity) || 0;
    const offerSum = parseFloat(offerRows[0]?.total_quantity) || 0;
    const total = donationSum + offerSum;
    res.json({ success: true, total_quantity: total });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

module.exports = router;
