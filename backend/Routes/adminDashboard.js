const express = require('express');
const router = express.Router();
const db = require('../db'); // Adjust path if needed

// Admin Dashboard Stats Endpoint
router.get('/dashboard-stats', async (req, res) => {
  try {
    // Initialize default values
    let totalFoodRescued = 0;
    let pendingApprovals = 0;
    let feedbackRes = [];
    let donationTrends = { labels: [], values: [] };

    // Total food rescued - try both table names
    try {
      const [foodRes] = await db.query('SELECT SUM(quantity) as totalFoodRescued FROM food_donations');
      totalFoodRescued = foodRes[0]?.totalFoodRescued || 0;
    } catch (e) {
      try {
        const [foodRes] = await db.query('SELECT SUM(quantity) as totalFoodRescued FROM donations');
        totalFoodRescued = foodRes[0]?.totalFoodRescued || 0;
      } catch (e2) {
        console.error('Error fetching food rescued:', e2.message);
      }
    }

    // Pending charity approvals - check unverified charities
    try {
      const [pendingRes] = await db.query('SELECT COUNT(*) as pendingApprovals FROM charity WHERE verified = 0 OR verified IS NULL');
      pendingApprovals = pendingRes[0]?.pendingApprovals || 0;
    } catch (e) {
      try {
        // Alternative: check charity_verifications table
        const [pendingRes] = await db.query('SELECT COUNT(*) as pendingApprovals FROM charity_verifications WHERE status = "pending"');
        pendingApprovals = pendingRes[0]?.pendingApprovals || 0;
      } catch (e2) {
        console.error('Error fetching pending approvals:', e2.message);
      }
    }

    // Recent feedback (last 5)
    try {
      [feedbackRes] = await db.query('SELECT comment, created_at FROM feedback ORDER BY created_at DESC LIMIT 5');
    } catch (e) {
      console.error('Error fetching feedback:', e.message);
    }

    // Donation trends (example: last 6 months)
    try {
      const [trendRows] = await db.query(`
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
        FROM donations
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6
      `);
      donationTrends.labels = trendRows.map(r => r.month).reverse();
      donationTrends.values = trendRows.map(r => r.count).reverse();
    } catch (e) {
      try {
        // Try alternate table name
        const [trendRows] = await db.query(`
          SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
          FROM food_donations
          GROUP BY month
          ORDER BY month DESC
          LIMIT 6
        `);
        donationTrends.labels = trendRows.map(r => r.month).reverse();
        donationTrends.values = trendRows.map(r => r.count).reverse();
      } catch (e2) {
        console.error('Error fetching donation trends:', e2.message);
      }
    }

    res.json({
      success: true,
      totalFoodRescued,
      pendingApprovals,
      recentFeedback: feedbackRes,
      donationTrends
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, error: err.message, message: 'Error fetching dashboard statistics' });
  }
});

// Admin Pie Chart: Donations by Category (all donations)
router.get('/donations/category-count', async (req, res) => {
  try {
    let rows = [];
    // Try food_donations table first
    try {
      [rows] = await db.query(
        'SELECT category, COUNT(*) as count FROM food_donations GROUP BY category'
      );
    } catch (e) {
      // Try alternate table name
      try {
        [rows] = await db.query(
          'SELECT category, COUNT(*) as count FROM donations GROUP BY category'
        );
      } catch (e2) {
        console.error('Error fetching category counts:', e2.message);
      }
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Category count error:', err);
    res.status(500).json({ success: false, error: err.message, message: 'Error fetching donation categories' });
  }
});

module.exports = router;
