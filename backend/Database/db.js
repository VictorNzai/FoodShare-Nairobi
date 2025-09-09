// Use the centralized database connection from the parent directory
const pool = require('../db');

// Get all pending donor offers for a charity
async function getDonorOffersForCharity(charityId) {
  const [rows] = await pool.query(
    'SELECT * FROM donor_offers WHERE charity_id = ? AND status = "pending"',
    [charityId]
  );
  return rows;
}

// Accept a donor offer
async function acceptDonorOffer(offerId) {
  await pool.query(
    'UPDATE donor_offers SET status = "accepted" WHERE id = ?',
    [offerId]
  );
}

// Deny a donor offer
async function denyDonorOffer(offerId) {
  await pool.query(
    'UPDATE donor_offers SET status = "denied" WHERE id = ?',
    [offerId]
  );
}

module.exports = {
  getDonorOffersForCharity,
  acceptDonorOffer,
  denyDonorOffer,
  query: (...args) => pool.query(...args)
};
