// backend/Routes/donorOffers.js
// Handles donor offer endpoints for charities to fetch, accept, or deny offers

const express = require('express');
const router = express.Router();

// Example: Replace with your actual DB logic
const db = require('../Database/db'); // You may need to adjust this path

// GET /api/donor-offers?charityId=xxx
// Get all pending donor offers for a specific charity
router.get('/', async (req, res) => {
  const { charityId } = req.query;
  if (!charityId) return res.status(400).json({ error: 'Missing charityId' });
  try {
    const offers = await db.getDonorOffersForCharity(charityId);
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// POST /api/donor-offers/:offerId/accept
// Charity accepts a donor offer
router.post('/:offerId/accept', async (req, res) => {
  const { offerId } = req.params;
  try {
    await db.acceptDonorOffer(offerId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

// POST /api/donor-offers/:offerId/deny
// Charity denies a donor offer
router.post('/:offerId/deny', async (req, res) => {
  const { offerId } = req.params;
  try {
    await db.denyDonorOffer(offerId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deny offer' });
  }
});

module.exports = router;
