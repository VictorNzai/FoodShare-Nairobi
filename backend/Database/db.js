require('dotenv').config();
const sslOptions = (process.env.DATABASE_SSL === 'true') ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined;
const pool = require('mysql2/promise').createPool({
  host: process.env.DATABASE_HOST || '25.18.191.107',
  user: process.env.DATABASE_USER || 'Dexter',
  password: process.env.DATABASE_PASSWORD || 'F00dshare123',
  database: process.env.DATABASE_NAME || 'foodshare_db',
  port: Number(process.env.DATABASE_PORT) || 3306,
  ssl: sslOptions,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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
