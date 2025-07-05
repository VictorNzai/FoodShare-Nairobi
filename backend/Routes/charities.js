const express = require('express');
// This module exports a function that takes the MySQL pool and returns a router
module.exports = function(pool) {
  const router = express.Router();

  // GET /api/charities - List all charities with required fields
  router.get('/', (req, res) => {
    pool.query(
      'SELECT id, orgname, email, phone, reg FROM charity',
      (err, results) => {
        if (err) {
          console.error('Error fetching charities:', err);
          return res.status(500).json({ success: false, message: 'Failed to fetch charities.' });
        }
        // Defensive: always return an array, even if empty
        res.json({ success: true, charities: Array.isArray(results) ? results : [] });
      }
    );
  });

  return router;
};
