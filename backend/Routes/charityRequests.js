const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Get all open food needs (charity requests)
  router.get('/api/charity-requests', (req, res) => {
    // Only show requests that are not fulfilled/cancelled
    const sql = `SELECT * FROM food_needs WHERE status = 'Pending' OR status = 'Open' ORDER BY date DESC, id DESC`;
    pool.query(sql, (err, results) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ success: false, message: 'Database error.' });
      }
      return res.json({ success: true, requests: results });
    });
  });


  // Get a single food need (charity request) by ID
  router.get('/api/charity-requests/:id', (req, res) => {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'Missing request ID.' });
    const sql = 'SELECT * FROM food_needs WHERE id = ? LIMIT 1';
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ success: false, message: 'Database error.' });
      }
      if (!results.length) return res.json({ success: false, message: 'Request not found.' });
      return res.json({ success: true, request: results[0] });
    });
  });

  return router;
};
