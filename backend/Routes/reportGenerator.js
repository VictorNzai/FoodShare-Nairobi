// backend/Routes/reportGenerator.js
// Backend route for generating downloadable CSV reports for admin

const express = require('express');
const router = express.Router();
const db = require('../db');
const { Parser } = require('json2csv');

// Utility: send CSV file
function sendCsv(res, filename, data, fields) {
  try {
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    // Set strict headers for CSV download and prevent caching
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate CSV.' });
  }
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// /api/admin/reports?type=TYPE&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { type, start: startDate, end: endDate } = req.query;
  if (!type || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Missing parameters.' });
  }
  if (!DATE_ONLY.test(startDate) || !DATE_ONLY.test(endDate)) {
    return res.status(400).json({ success: false, message: 'Dates must be in YYYY-MM-DD format.' });
  }
  if (startDate > endDate) {
    return res.status(400).json({ success: false, message: 'Start date must be on or before end date.' });
  }
  // Cover the full days (the columns are DATETIME/TIMESTAMP)
  const start = startDate + ' 00:00:00';
  const end = endDate + ' 23:59:59';
  const range = `${startDate}_to_${endDate}`;
  try {
    let data = [], fields = [], filename = '';
    switch (type) {
      case 'donations': {
        // Donation Trends: date, total donations, total quantity, unique donors
        [data] = await db.query(
          `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as total_donations, SUM(quantity) as total_quantity, COUNT(DISTINCT donor_id) as unique_donors
           FROM food_donations
           WHERE created_at BETWEEN ? AND ?
           GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
           ORDER BY date ASC`,
          [start, end]
        );
        fields = ['date', 'total_donations', 'total_quantity', 'unique_donors'];
        filename = `donation_trends_${range}.csv`;
        break;
      }
      case 'category': {
        // Donations by Category: category, unit, count, total_quantity
        [data] = await db.query(
          `SELECT category, unit, COUNT(*) as count, SUM(quantity) as total_quantity
           FROM food_donations
           WHERE created_at BETWEEN ? AND ?
           GROUP BY category, unit
           ORDER BY count DESC`,
          [start, end]
        );
        fields = ['category', 'unit', 'count', 'total_quantity'];
        filename = `donations_by_category_${range}.csv`;
        break;
      }
      case 'users': {
        // User Activity: every donor and charity, with their activity in the range.
        // donations_count is donations made (donors) or offers received (charities).
        const [donors] = await db.query(
          `SELECT d.id, d.fullname as name, d.email, 'donor' as type, d.status,
            (SELECT COUNT(*) FROM food_donations fd WHERE fd.donor_id = d.id AND fd.created_at BETWEEN ? AND ?) as donations_count
           FROM donor d
           ORDER BY d.id ASC`,
          [start, end]
        );
        const [charities] = await db.query(
          `SELECT c.id, c.orgname as name, c.email, 'charity' as type, c.status,
            (SELECT COUNT(*) FROM donor_offers o WHERE o.charity_id = c.id AND o.created_at BETWEEN ? AND ?) as donations_count
           FROM charity c
           ORDER BY c.id ASC`,
          [start, end]
        );
        data = [...donors, ...charities];
        fields = ['id', 'name', 'email', 'type', 'status', 'donations_count'];
        filename = `user_activity_${range}.csv`;
        break;
      }
      case 'food': {
        // Food Rescued: all columns
        [data] = await db.query(
          `SELECT id, donor_id, category, description, quantity, unit, expiry, pickup_address, notes, status, created_at, updated_at
           FROM food_donations
           WHERE created_at BETWEEN ? AND ?
           ORDER BY created_at DESC`,
          [start, end]
        );
        fields = ['id', 'donor_id', 'category', 'description', 'quantity', 'unit', 'expiry', 'pickup_address', 'notes', 'status', 'created_at', 'updated_at'];
        filename = `food_rescued_${range}.csv`;
        break;
      }
      case 'feedback': {
        // Feedback Summary: who said what, with rating and category
        const [rows] = await db.query(
          `SELECT f.id, d.fullname as donor_name, c.orgname as charity_name, f.category, f.rating, f.comment, f.created_at
           FROM feedback f
           LEFT JOIN donor d ON d.id = f.donor_id
           LEFT JOIN charity c ON c.id = f.charity_id
           WHERE f.created_at BETWEEN ? AND ?
           ORDER BY f.created_at DESC`,
          [start, end]
        );
        data = rows.map(({ donor_name, charity_name, ...row }) => ({
          ...row,
          user: donor_name || charity_name || '',
          user_type: donor_name ? 'donor' : charity_name ? 'charity' : ''
        }));
        fields = ['id', 'user', 'user_type', 'category', 'rating', 'comment', 'created_at'];
        filename = `feedback_summary_${range}.csv`;
        break;
      }
      case 'approvals': {
        // Pending & Completed Approvals: charity verification requests
        [data] = await db.query(
          `SELECT id, charity_name, address, contact, status, submitted_at
           FROM charity_verifications
           WHERE submitted_at BETWEEN ? AND ?
           ORDER BY submitted_at DESC`,
          [start, end]
        );
        fields = ['id', 'charity_name', 'address', 'contact', 'status', 'submitted_at'];
        filename = `approvals_${range}.csv`;
        break;
      }
      case 'top': {
        // Top Donors & Charities: the 20 busiest of each in the range.
        // total_donations is donations made (donors) or offers received (charities).
        const [topDonors] = await db.query(
          `SELECT d.id, d.fullname as name, 'donor' as type, COUNT(fd.id) as total_donations
           FROM donor d
           LEFT JOIN food_donations fd ON fd.donor_id = d.id AND fd.created_at BETWEEN ? AND ?
           GROUP BY d.id, d.fullname
           ORDER BY total_donations DESC
           LIMIT 20`,
          [start, end]
        );
        const [topCharities] = await db.query(
          `SELECT c.id, c.orgname as name, 'charity' as type, COUNT(o.id) as total_donations
           FROM charity c
           LEFT JOIN donor_offers o ON o.charity_id = c.id AND o.created_at BETWEEN ? AND ?
           GROUP BY c.id, c.orgname
           ORDER BY total_donations DESC
           LIMIT 20`,
          [start, end]
        );
        data = [...topDonors, ...topCharities];
        fields = ['id', 'name', 'type', 'total_donations'];
        filename = `top_donors_charities_${range}.csv`;
        break;
      }
      default:
        return res.status(400).json({ success: false, message: 'Unknown report type.' });
    }
    sendCsv(res, filename, data, fields);
  } catch (err) {
    console.error("Report generation error:", err); // Log the full error for debugging
    res.status(500).json({ success: false, message: 'Error generating report.' });
  }
});

module.exports = router;
