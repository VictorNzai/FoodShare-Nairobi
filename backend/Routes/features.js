// Notifications inbox, complaints and appeals, pickup oversight and impact.
// Mounted at /api. Tables are created by Utils/schema.js.

const express = require('express');
const router = express.Router();
const db = require('../db');
const { notify, LINKS, ADMIN_ID } = require('../Utils/notify');

const USER_TYPES = ['donor', 'charity', 'admin'];
const CASE_KINDS = ['complaint', 'appeal'];
const CASE_STATUSES = ['Open', 'In Review', 'Resolved', 'Dismissed'];

// Current Nairobi time in the same shape as donor_offers.pickup_at, so the two
// compare as text. ponytail: one fixed timezone; store UTC if the app leaves Kenya.
function nairobiNow() {
  return new Date()
    .toLocaleString('sv-SE', { timeZone: 'Africa/Nairobi' })
    .slice(0, 16)
    .replace(' ', 'T');
}

// Warn a donor once about each pending offer that expires within two days.
// ponytail: runs when the donor opens the app, not on a schedule; add a daily
// job if warnings must reach donors who are not logged in.
async function addExpiryWarnings(donorId) {
  const [offers] = await db.query(
    `SELECT id, food_type, charity_name, expiry FROM donor_offers
     WHERE donor_id = ? AND status = 'Pending' AND expiry_notified = 0
       AND expiry <= DATE_ADD(CURDATE(), INTERVAL 2 DAY)`,
    [donorId]
  );
  for (const offer of offers) {
    await notify(
      'donor',
      donorId,
      `Your ${offer.food_type} offer to ${offer.charity_name} is about to expire and has not been accepted yet.`,
      LINKS.donorDonations
    );
    await db.query('UPDATE donor_offers SET expiry_notified = 1 WHERE id = ?', [offer.id]);
  }
}

// ---- Inbox ----
router.get('/inbox/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  if (!USER_TYPES.includes(type)) return res.status(400).json({ success: false, message: 'Unknown user type.' });
  try {
    if (type === 'donor') {
      try {
        await addExpiryWarnings(id);
      } catch (err) {
        console.error('Expiry warnings failed:', err.message);
      }
    }
    const [notifications] = await db.query(
      `SELECT id, message, link, is_read, created_at FROM fs_notifications
       WHERE user_type = ? AND user_id = ? ORDER BY id DESC LIMIT 30`,
      [type, id]
    );
    res.json({ success: true, notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/inbox/:type/:id/read', async (req, res) => {
  const { type, id } = req.params;
  try {
    await db.query('UPDATE fs_notifications SET is_read = 1 WHERE user_type = ? AND user_id = ?', [type, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---- Complaints and appeals ----
router.post('/cases', async (req, res) => {
  const { kind, user_type, user_id, user_name, offer_id, description } = req.body || {};
  if (!CASE_KINDS.includes(kind) || !['donor', 'charity'].includes(user_type) || !user_id || !String(description || '').trim()) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  try {
    await db.query(
      'INSERT INTO fs_cases (kind, user_type, user_id, user_name, offer_id, description) VALUES (?, ?, ?, ?, ?, ?)',
      [kind, user_type, user_id, user_name || null, Number(offer_id) || null, String(description).trim()]
    );
    await notify('admin', ADMIN_ID, `New ${kind} from ${user_name || user_type}.`, LINKS.adminCases);
    res.json({ success: true, message: 'Report submitted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// A user's own cases
router.get('/cases', async (req, res) => {
  const { user_type, user_id } = req.query;
  if (!user_type || !user_id) return res.status(400).json({ success: false, message: 'Missing user.' });
  try {
    const [cases] = await db.query(
      'SELECT * FROM fs_cases WHERE user_type = ? AND user_id = ? ORDER BY id DESC',
      [user_type, user_id]
    );
    res.json({ success: true, cases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/admin/cases', async (req, res) => {
  const { status } = req.query;
  const filtered = status && status !== 'all';
  try {
    const [cases] = await db.query(
      `SELECT * FROM fs_cases ${filtered ? 'WHERE status = ?' : ''} ORDER BY id DESC`,
      filtered ? [status] : []
    );
    res.json({ success: true, cases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Admin sets the status and the outcome; the reporter is told
router.post('/admin/cases/:id', async (req, res) => {
  const { status, outcome } = req.body || {};
  if (!CASE_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Unknown status.' });
  try {
    const [rows] = await db.query('SELECT kind, user_type, user_id FROM fs_cases WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Case not found.' });
    await db.query('UPDATE fs_cases SET status = ?, outcome = ? WHERE id = ?', [status, outcome || null, req.params.id]);
    const { kind, user_type, user_id } = rows[0];
    await notify(
      user_type,
      user_id,
      `Your ${kind} is now "${status}".${outcome ? ' ' + outcome : ''}`,
      user_type === 'donor' ? LINKS.donorReports : LINKS.charityReports
    );
    res.json({ success: true, message: 'Case updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---- Pickup oversight (admin) ----
router.get('/admin/pickups', async (req, res) => {
  try {
    const [late] = await db.query(
      `SELECT id, donor_name, charity_name, food_type, quantity, unit, pickup_at FROM donor_offers
       WHERE status = 'Scheduled' AND pickup_at IS NOT NULL AND pickup_at < ?
       ORDER BY pickup_at ASC`,
      [nairobiNow()]
    );
    const [expired] = await db.query(
      `SELECT id, donor_name, charity_name, food_type, quantity, unit, expiry FROM donor_offers
       WHERE status = 'Pending' AND expiry < CURDATE()
       ORDER BY expiry DESC LIMIT 100`
    );
    res.json({ success: true, late, expired });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---- Impact ----
// `donated` is everything the donor has given: offers to a charity plus general
// donations. `pickups` is the part a charity has confirmed as collected.
router.get('/impact/donor/:id', async (req, res) => {
  try {
    const [offers] = await db.query(
      `SELECT id, charity_id, charity_name, food_type, quantity, unit, status, people_fed, completed_at, created_at
       FROM donor_offers WHERE donor_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );
    const [donations] = await db.query(
      `SELECT id, category AS food_type, quantity, unit, status, created_at
       FROM food_donations WHERE donor_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );
    const donated = [...offers, ...donations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const pickups = offers.filter((o) => o.status === 'Completed');
    // Offers a charity turned down, and cancelled donations, were not given
    const given = donated.filter((d) => !['Denied', 'Cancelled'].includes(d.status));
    res.json({
      success: true,
      donated,
      pickups,
      total_donated: given.reduce((sum, d) => sum + (parseFloat(d.quantity) || 0), 0),
      total_quantity: pickups.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0),
      charities_helped: new Set(pickups.map((p) => p.charity_id)).size,
      people_fed: pickups.reduce((sum, p) => sum + (p.people_fed || 0), 0)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/admin/impact', async (req, res) => {
  try {
    const [months] = await db.query(
      `SELECT DATE_FORMAT(COALESCE(completed_at, created_at), '%Y-%m') AS month,
              COUNT(*) AS pickups, SUM(quantity) AS quantity, SUM(people_fed) AS people_fed
       FROM donor_offers WHERE status = 'Completed'
       GROUP BY month ORDER BY month DESC LIMIT 12`
    );
    res.json({ success: true, months });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
