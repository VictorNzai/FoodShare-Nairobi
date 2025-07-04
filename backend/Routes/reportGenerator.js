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

// /api/admin/reports?type=TYPE&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', async (req, res) => {
  let { type, start, end } = req.query;
  if (!type || !start || !end) {
    return res.status(400).json({ success: false, message: 'Missing parameters.' });
  }
  // Ensure start and end cover the full days (add time for SQL DATETIME columns)
  if (start.length === 10) start = start + ' 00:00:00';
  if (end.length === 10) end = end + ' 23:59:59';
  // Debug: log the actual params used for the report
  console.log('Report params:', { type, start, end });
  try {
    let data = [], fields = [], filename = '';
    switch (type) {
       case 'donations': {
        // Donation Trends: date, total donations, total quantity, unique donors
        const donations = await db.query(
          `SELECT DATE(created_at) as date, COUNT(*) as total_donations, SUM(quantity) as total_quantity, COUNT(DISTINCT donor_id) as unique_donors
           FROM food_donations
           WHERE created_at BETWEEN ? AND ?
           GROUP BY DATE(created_at)
           ORDER BY date ASC`,
          [start, end]
        );
        data = donations;
        fields = ['date', 'total_donations', 'total_quantity', 'unique_donors'];
        filename = `donation_trends_${start}_to_${end}.csv`;
        break;
      }
       case 'category': {
        // Donations by Category: category, unit, count, total_quantity
        const byCat = await db.query(
          `SELECT category, unit, COUNT(*) as count, SUM(quantity) as total_quantity
           FROM food_donations
           WHERE created_at BETWEEN ? AND ?
           GROUP BY category, unit
           ORDER BY count DESC`,
          [start, end]
        );
        data = byCat;
        fields = ['category', 'unit', 'count', 'total_quantity'];
        filename = `donations_by_category_${start}_to_${end}.csv`;
        break;
      }
      case 'users':
        // User Activity: id, name, email, type, status, donations_count
        // Use donor and charity tables for users
        // For this example, only donors are included. You can expand as needed.
        const donors = await db.query(
          `SELECT d.id, d.name, d.email, 'donor' as type, d.status,
            (SELECT COUNT(*) FROM food_donations fd WHERE fd.donor_id = d.id AND fd.created_at BETWEEN ? AND ?) as donations_count
           FROM donor d
           WHERE d.created_at <= ?`,
          [start, end, end]
        );
        // You can add similar logic for charities if needed
        data = donors;
        fields = ['id', 'name', 'email', 'type', 'status', 'donations_count'];
        filename = `user_activity_${start}_to_${end}.csv`;
        break;
      case 'food': {
        // Food Rescued: all columns
        const food = await db.query(
          `SELECT id, donor_id, category, description, quantity, unit, expiry, pickup_address, notes, status, created_at, updated_at
           FROM food_donations
           WHERE created_at BETWEEN ? AND ?
           ORDER BY created_at DESC`,
          [start, end]
        );
        data = food;
        fields = ['id', 'donor_id', 'category', 'description', 'quantity', 'unit', 'expiry', 'pickup_address', 'notes', 'status', 'created_at', 'updated_at'];
        filename = `food_rescued_${start}_to_${end}.csv`;
        break;
      }
      case 'feedback':
        // Feedback Summary: id, user, comment, created_at
        // If you have a feedback table, adjust the name accordingly. Otherwise, skip or implement as needed.
        data = [];
        fields = ['id', 'user', 'comment', 'created_at'];
        filename = `feedback_summary_${start}_to_${end}.csv`;
        break;
      case 'approvals':
        // Pending & Completed Approvals: id, charity_name, status, submitted_at, reviewed_at
        const approvals = await db.query(
          `SELECT id, charity_name, status, submitted_at, reviewed_at
           FROM charity_verifications
           WHERE submitted_at BETWEEN ? AND ?
           ORDER BY submitted_at DESC`,
          [start, end]
        );
        data = approvals;
        fields = ['id', 'charity_name', 'status', 'submitted_at', 'reviewed_at'];
        filename = `approvals_${start}_to_${end}.csv`;
        break;
      case 'top':
        // Top Donors & Charities: id, name, type, total_donations
        // For this example, only donors are included. You can expand as needed.
        const topDonors = await db.query(
          `SELECT d.id, d.name, 'donor' as type, COUNT(fd.id) as total_donations
           FROM donor d
           LEFT JOIN food_donations fd ON fd.donor_id = d.id AND fd.created_at BETWEEN ? AND ?
           GROUP BY d.id, d.name
           ORDER BY total_donations DESC
           LIMIT 20`,
          [start, end]
        );
        data = topDonors;
        fields = ['id', 'name', 'type', 'total_donations'];
        filename = `top_donors_charities_${start}_to_${end}.csv`;
        break;
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
