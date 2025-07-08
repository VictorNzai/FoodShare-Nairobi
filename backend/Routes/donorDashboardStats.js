const express = require('express');
const router = express.Router();

let pool;
function setPool(p) {
  pool = p;
}

// --- Donor Dashboard Stats Endpoints ---

// GET /api/donor/stats/total-donations?donor_id=ID
// Returns total count of all donations made by the donor
router.get('/stats/total-donations', async (req, res) => {
  const donorId = req.query.donor_id;
  if (!donorId) return res.status(400).json({ success: false, message: 'Missing donor_id' });
  
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM food_donations WHERE donor_id = ?',
      [donorId]
    );
    res.json({ success: true, count: rows[0]?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// GET /api/donor/stats/food-sum?donor_id=ID
// Returns total quantity of food donated
router.get('/stats/food-sum', async (req, res) => {
  const donorId = req.query.donor_id;
  if (!donorId) return res.status(400).json({ success: false, message: 'Missing donor_id' });
  try {
    // Get sum from food_donations
    const [donationRows] = await pool.query(
      'SELECT SUM(quantity) AS total_quantity FROM food_donations WHERE donor_id = ?',
      [donorId]
    );
    // Get sum from donor_offers
    const [offerRows] = await pool.query(
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

// GET /api/donor/stats/charities-helped?donor_id=ID
// Returns count of distinct charities helped (fixed typo)
// router.get('/stats/charities-helped', async (req, res) => {
//   const donorId = req.query.donor_id;
//   if (!donorId) return res.status(400).json({ success: false, message: 'Missing donor_id' });
  
//   try {
//     const [rows] = await pool.query(
//       'SELECT COUNT(DISTINCT charity_id) AS count FROM food_donations WHERE donor_id = ? AND status IN ("active", "completed")',
//       [donorId]
//     );
//     res.json({ success: true, count: rows[0]?.count ?? 0 });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Database error' });
//   }
// });

module.exports = (passedPool) => {
  setPool(passedPool);
  return router;
};