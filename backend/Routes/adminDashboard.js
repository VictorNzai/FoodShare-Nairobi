const express = require('express');
const router = express.Router();
const db = require('../db'); // Adjust path if needed

// Admin Dashboard Stats Endpoint
router.get('/dashboard-stats', async (req, res) => {
  try {
    // Total food rescued
    const [foodRes] = await db.query('SELECT SUM(quantity) as totalFoodRescued FROM food_donations');
    // Pending charity approvals
    const [pendingRes] = await db.query('SELECT COUNT(*) as pendingApprovals FROM charity WHERE status = "pending"');
    // Recent feedback (last 5)
    let feedbackRes = [];
    try {
      [feedbackRes] = await db.query('SELECT comment, user FROM feedback ORDER BY created_at DESC LIMIT 5');
    } catch (e) {}
    // Donation trends (example: last 6 months)
    let donationTrends = { labels: [], values: [] };
    try {
      const [trendRows] = await db.query(`
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
        FROM food_donations
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6
      `);
      donationTrends.labels = trendRows.map(r => r.month).reverse();
      donationTrends.values = trendRows.map(r => r.count).reverse();
    } catch (e) {}
    res.json({
      totalFoodRescued: foodRes[0]?.totalFoodRescued || 0,
      pendingApprovals: pendingRes[0]?.pendingApprovals || 0,
      recentFeedback: feedbackRes,
      donationTrends
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Pie Chart: Donations by Category (all donations)
router.get('/donations/category-count', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT category, COUNT(*) as count FROM food_donations GROUP BY category'
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
