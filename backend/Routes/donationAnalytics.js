// donationAnalytics.js - Returns donation counts by category for analytics
const express = require('express');

// Export a function that takes the pool as an argument
module.exports = function (pool) {
  const router = express.Router();

  // GET /api/donations/analytics/category-count
  // Optional: pass donor_id as query param to filter by donor
  router.get('/category-count', async (req, res) => {
    try {
      const { donor_id } = req.query;
      let sql = 'SELECT category, COUNT(*) as count FROM food_donations';
      let params = [];
      if (donor_id) {
        sql += ' WHERE donor_id = ?';
        params.push(donor_id);
      }
      sql += ' GROUP BY category';
      const [rows] = await pool.execute(sql, params);
      res.json({ data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error.' });
    }
  });

  return router;
};
