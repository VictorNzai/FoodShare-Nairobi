const express = require('express');
const router = express.Router();

// Use the pool passed from server.js
let pool;
function setPool(p) { pool = p; }

// Middleware to require donor role (assumes req.user is set by auth middleware)
function requireDonor(req, res, next) {
    if (!req.user || req.user.role !== 'donor') {
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    next();
}

// GET donor profile
router.get('/profile', requireDonor, async (req, res) => {
    try {
        const [userRows] = await pool.query('SELECT email, role FROM users WHERE id = ?', [req.user.id]);
        const [profileRows] = await pool.query('SELECT full_name, phone FROM donors WHERE user_id = ?', [req.user.id]);
        if (!userRows.length || !profileRows.length) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }
        // Assume email verification status is in users.verified (bool)
        const verified = userRows[0].verified || false;
        res.json({ success: true, profile: { ...userRows[0], ...profileRows[0], verified } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching profile.' });
    }
});

// UPDATE donor profile
router.put('/profile', requireDonor, async (req, res) => {
    const { full_name, phone } = req.body;
    try {
        await pool.query('UPDATE donors SET full_name = ?, phone = ? WHERE user_id = ?', [full_name, phone, req.user.id]);
        res.json({ success: true, message: 'Profile updated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error updating profile.' });
    }
});

// POST: Send email verification (stub)
router.post('/verify-email', requireDonor, async (req, res) => {
    // TODO: Implement actual email sending logic
    res.json({ success: true, message: 'Verification email sent (stub).' });
});

// DELETE: Delete donor account
router.delete('/account', requireDonor, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.user.id]);
        res.json({ success: true, message: 'Account deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error deleting account.' });
    }
});

module.exports = (passedPool) => {
  setPool(passedPool);
  return router;
};
