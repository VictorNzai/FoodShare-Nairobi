const express = require('express');
require('dotenv').config();
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const authRoutes = require('./Routes/auth'); // Adjust path if needed

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use('/auth', authRoutes);
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads/charity-verifications', express.static(path.join(__dirname, 'uploads/charity-verifications')));

// File Upload (Charity Verifications)
const uploadDir = path.join(__dirname, './uploads/charity-verifications');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

// DB Connection
const sslOptions = (process.env.DATABASE_SSL === 'true') ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined;
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || '25.18.191.107',
  user: process.env.DATABASE_USER || 'Dexter',
  password: process.env.DATABASE_PASSWORD || 'F00dshare123',
  database: process.env.DATABASE_NAME || 'foodshare_db',
  port: Number(process.env.DATABASE_PORT) || 3306,
  ssl: sslOptions,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('Connected to foodshare_db');
    conn.release();
  } catch (err) {
    console.error('Failed to connect to foodshare_db:', err);
    process.exit(1);
  }
})();


// Charity Requests API (modular route) - require after pool is defined
const charityRequestsRoutes = require('./Routes/charityRequests');
app.use('/', charityRequestsRoutes(pool));

// Donor Account/Profile API (modular route)
const donorAccountRoutes = require('./Routes/donorAccount');
app.use('/api/donor', donorAccountRoutes(pool));

// Food Donations API (modular route)
const donationsRoutes = require('./Routes/donations');
app.use('/api/donations', donationsRoutes);

// Donor Offers API (modular route)
const donorOffersRoutes = require('./Routes/donor_offers');
app.use('/api/donor-offers', donorOffersRoutes);

// Donation Analytics API (modular route)
const donationAnalyticsRoutes = require('./Routes/donationAnalytics');
app.use('/api/donations/analytics', donationAnalyticsRoutes);

// Admin Dashboard API (modular route)
const adminDashboardRoutes = require('./Routes/adminDashboard');
app.use('/api/admin', adminDashboardRoutes);

// Feedback API
const feedbackRoutes = require('./Routes/feedback');
app.use('/api/feedback', feedbackRoutes);

// Admin Reports API (CSV download)
const reportGenerator = require('./Routes/reportGenerator');
app.use('/api/admin/reports', reportGenerator);

// Charities API (Browse Charities page)
const charitiesRoutes = require('./Routes/charities');
app.use('/api/charities', charitiesRoutes(pool));

// Food Needs API (modular route)
const foodNeedsRoutes = require('./Routes/food_needs');
app.use('/api/food-needs', foodNeedsRoutes);

// Email Verification API (for sending verification links)
const emailVerificationRoutes = require('./Routes/emailVerification');
app.use('/api/email', emailVerificationRoutes);

// --- Admin Charity Verification Endpoints ---
app.get('/api/admin/charity-verifications', async (req, res) => {
  let sql = 'SELECT * FROM charity_verifications';
  const params = [];
  if (req.query.status && req.query.status !== 'all') {
    sql += ' WHERE status = ?';
    params.push(req.query.status);
  }
  sql += ' ORDER BY submitted_at DESC';
  try {
    const [results] = await pool.query(sql, params);
    res.json({ success: true, verifications: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

app.post('/api/admin/charity-verifications/:id/approve', async (req, res) => {
  const id = req.params.id;
  try {
    // First, approve the verification
    await pool.query('UPDATE charity_verifications SET status = "approved" WHERE id = ?', [id]);
    // Get the charity name and email from the verification row
    const [results] = await pool.query('SELECT charity_name, contact FROM charity_verifications WHERE id = ?', [id]);
    if (!results.length) {
      return res.json({ success: true, message: 'Charity verification approved, but could not update charity verified status.' });
    }
    const charityName = results[0].charity_name;
    // Try to get the email from the charity table (contact in verifications may not be email)
    let charityEmail = null;
    const [charityRows] = await pool.query('SELECT email FROM charity WHERE orgname = ?', [charityName]);
    if (charityRows.length > 0) {
      charityEmail = charityRows[0].email;
    } else {
      // fallback: use contact field if it looks like an email
      if (results[0].contact && results[0].contact.includes('@')) {
        charityEmail = results[0].contact;
      }
    }
    // Update the charity table to set verified = 1
    await pool.query('UPDATE charity SET verified = 1 WHERE orgname = ?', [charityName]);
    // Also update the charity_verifications table to set verified = 1 for this row
    await pool.query('UPDATE charity_verifications SET verified = 1 WHERE id = ?', [id]);

    // Send approval email if email found
    if (charityEmail) {
      try {
        const { sendCharityApprovalEmail } = require('./Utils/charityApprovalEmail');
        await sendCharityApprovalEmail(charityEmail, charityName);
      } catch (emailErr) {
        // Log but don't fail the approval if email fails
        console.error('Failed to send approval email:', emailErr);
      }
    }
    res.json({ success: true, message: 'Charity verification approved and both tables marked as verified.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

app.post('/api/admin/charity-verifications/:id/reject', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('UPDATE charity_verifications SET status = "rejected" WHERE id = ?', [id]);
    res.json({ success: true, message: 'Charity verification rejected.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Donor Signup
app.post('/signup/donor', async (req, res) => {
  const { fullname, email, phone, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO donor (fullname, email, phone, password) VALUES (?, ?, ?, ?)';
    await pool.query(query, [fullname, email, phone, hashed]);
    res.status(200).json({ success: true, message: 'Donor account created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.sqlMessage || 'Server error' });
  }
});

// Charity Signup
app.post('/signup/charity', async (req, res) => {
  const { orgname, email, phone, reg, password, confirmPassword, institutionType } = req.body;
  if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO charity (orgname, email, phone, reg, password, institution_type) VALUES (?, ?, ?, ?, ?, ?)';
    await pool.query(query, [orgname, email, phone, reg, hashed, institutionType]);
    res.status(200).json({ success: true, message: 'Charity account created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.sqlMessage || 'Server error' });
  }
});

// Login (general)
app.post('/auth/login', async (req, res) => {
  const { email, password, role, accessKey } = req.body;
  try {
    if (role === 'admin') {
      const [results] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
      if (results.length === 0 || results[0].password !== password || results[0].access_key !== accessKey)
        return res.status(401).json({ message: 'Invalid credentials or access key' });
      if (results[0].status === 'banned') {
        return res.status(403).json({
          success: false,
          banned: true,
          message: 'Your admin account has been banned. If you believe this is a mistake, please appeal.',
          canAppeal: true
        });
      }
      return res.json({
        success: true,
        message: 'Admin login successful',
        admin: { id: results[0].id, fullname: results[0].fullname, email: results[0].email },
        dashboard: '/AdminPages/AdminDashboard.html'
      });
    } else if (role === 'donor') {
      const [results] = await pool.query('SELECT * FROM donor WHERE email = ?', [email]);
      if (results.length === 0) return res.status(401).json({ message: 'Invalid email or password' });
      const match = await bcrypt.compare(password, results[0].password);
      if (!match) return res.status(401).json({ message: 'Invalid email or password' });
      if (results[0].status === 'banned') {
        return res.status(403).json({
          success: false,
          banned: true,
          message: 'Your donor account has been banned. If you believe this is a mistake, please appeal.',
          canAppeal: true
        });
      }
      return res.json({
        success: true,
        message: 'Donor login successful',
        donor: { id: results[0].id, fullname: results[0].fullname, email: results[0].email, phone: results[0].phone },
        dashboard: '/FoodDonor Pages/FoodDonor.html'
      });
    } else if (role === 'charity') {
      const [results] = await pool.query('SELECT * FROM charity WHERE email = ?', [email]);
      if (results.length === 0) return res.status(401).json({ message: 'Invalid email or password' });
      const match = await bcrypt.compare(password, results[0].password);
      if (!match) return res.status(401).json({ message: 'Invalid email or password' });
      if (results[0].status === 'banned') {
        return res.status(403).json({
          success: false,
          banned: true,
          message: 'Your charity account has been banned. If you believe this is a mistake, please appeal.',
          canAppeal: true
        });
      }
      return res.json({
        success: true,
        message: 'Charity login successful',
        charity: {
          id: results[0].id,
          orgname: results[0].orgname,
          email: results[0].email,
          phone: results[0].phone,
          reg: results[0].reg,
          verified: results[0].verified === 1 || results[0].verified === true
        },
        dashboard: '/Charity Pages/CharityDashboard.html'
      });
    } else {
      return res.status(400).json({ message: 'Unknown role' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Donor Login (dedicated endpoint)
app.post('/auth/login/donor', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await pool.query('SELECT * FROM donor WHERE email = ?', [email]);
    if (results.length === 0) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const match = await bcrypt.compare(password, results[0].password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (results[0].status === 'banned') {
      return res.status(403).json({
        success: false,
        banned: true,
        message: 'Your donor account has been banned. If you believe this is a mistake, please appeal.',
        canAppeal: true
      });
    }
    const donor = results[0];
    res.json({ success: true, message: 'Login successful', donor: { id: donor.id, fullname: donor.fullname, email: donor.email, phone: donor.phone } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Charity Login (dedicated endpoint)
app.post('/auth/login/charity', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await pool.query('SELECT * FROM charity WHERE email = ?', [email]);
    if (results.length === 0) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const match = await bcrypt.compare(password, results[0].password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (results[0].status === 'banned') {
      return res.status(403).json({
        success: false,
        banned: true,
        message: 'Your charity account has been banned. If you believe this is a mistake, please appeal.',
        canAppeal: true
      });
    }
    const charity = results[0];
    res.json({
      success: true,
      message: 'Login successful',
      charity: {
        id: charity.id,
        orgname: charity.orgname,
        email: charity.email,
        phone: charity.phone,
        reg: charity.reg,
        verified: charity.verified === 1 || charity.verified === true
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Submit Charity Verification
app.post('/api/verify-charity', upload.fields([
  { name: 'idUpload', maxCount: 1 },
  { name: 'certUpload', maxCount: 1 }
]), async (req, res) => {
  const { charityName, address, contact, desc } = req.body;
  const idFile = req.files['idUpload']?.[0]?.filename;
  const certFile = req.files['certUpload']?.[0]?.filename;
  if (!charityName || !address || !contact || !desc || !idFile || !certFile)
    return res.status(400).json({ success: false, message: 'Missing required fields or files.' });
  const sql = `INSERT INTO charity_verifications 
    (charity_name, address, contact, description, id_file, cert_file, status, submitted_at) 
    VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`;
  try {
    await pool.query(sql, [charityName, address, contact, desc, idFile, certFile]);
    res.json({ success: true, message: 'Verification submitted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// --- Admin User Management Endpoints ---
// List users (with optional type, search, status)
app.get('/api/admin/users', async (req, res) => {
  const { type = 'donor', search = '', status = '' } = req.query;
  let table = '';
  if (type === 'donor') table = 'donor';
  else if (type === 'charity') table = 'charity';
  else if (type === 'admin') table = 'admins';
  else return res.status(400).json({ success: false, message: 'Invalid user type' });
  let sql = '';
  if (type === 'charity') {
    sql = 'SELECT id, orgname AS name, email, status FROM charity';
  } else if (type === 'donor') {
    sql = 'SELECT id, fullname AS name, email, status FROM donor';
  } else if (type === 'admin') {
    sql = 'SELECT id, fullname AS name, email, status FROM admins';
  }
  const params = [];
  const where = [];
  if (search) {
    if (type === 'charity') {
      where.push('(orgname LIKE ? OR email LIKE ? OR status LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    } else if (type === 'donor') {
      where.push('(fullname LIKE ? OR email LIKE ? OR status LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    } else if (type === 'admin') {
      where.push('(fullname LIKE ? OR email LIKE ? OR status LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
  }
  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY id DESC';
  try {
    const [results] = await pool.query(sql, params);
    res.json({ success: true, users: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Ban user (admin action)
app.post('/api/admin/users/:type/:id/ban', async (req, res) => {
  const { type, id } = req.params;
  let table = '';
  if (type === 'donor') table = 'donor';
  else if (type === 'charity') table = 'charity';
  else if (type === 'admin') table = 'admins';
  else return res.status(400).json({ success: false, message: 'Invalid user type' });
  const sql = `UPDATE ${table} SET status = 'banned' WHERE id = ?`;
  try {
    const [result] = await pool.query(sql, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User banned.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Unban user (admin action)
app.post('/api/admin/users/:type/:id/unban', async (req, res) => {
  const { type, id } = req.params;
  let table = '';
  if (type === 'donor') table = 'donor';
  else if (type === 'charity') table = 'charity';
  else if (type === 'admin') table = 'admins';
  else return res.status(400).json({ success: false, message: 'Invalid user type' });
  const sql = `UPDATE ${table} SET status = 'active' WHERE id = ?`;
  try {
    const [result] = await pool.query(sql, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User unbanned.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Promote user to admin (for donor/charity)
app.post('/api/admin/users/:type/:id/promote', async (req, res) => {
  const { type, id } = req.params;
  let selectSql = '';
  if (type === 'donor') selectSql = 'SELECT * FROM donor WHERE id = ?';
  else if (type === 'charity') selectSql = 'SELECT * FROM charity WHERE id = ?';
  else return res.status(400).json({ success: false, message: 'Invalid user type' });
  try {
    const [results] = await pool.query(selectSql, [id]);
    if (!results.length) return res.status(404).json({ success: false, message: 'User not found.' });
    const user = results[0];
    // Insert into admins table
    const insertSql = 'INSERT INTO admins (fullname, email, status, password) VALUES (?, ?, ?, ?)';
    await pool.query(insertSql, [user.fullname || user.orgname, user.email, 'active', user.password]);
    res.json({ success: true, message: 'User promoted to admin.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to promote user.' });
  }
});

// Demote admin (remove from admins table)
app.post('/api/admin/users/admin/:id/demote', async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM admins WHERE id = ?';
  try {
    const [result] = await pool.query(sql, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'Admin demoted/removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Delete user (admin action)
app.delete('/api/admin/users/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  let table = '';
  if (type === 'donor') table = 'donor';
  else if (type === 'charity') table = 'charity';
  else if (type === 'admin') table = 'admins';
  else return res.status(400).json({ success: false, message: 'Invalid user type' });
  const sql = `DELETE FROM ${table} WHERE id = ?`;
  try {
    const [result] = await pool.query(sql, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// View user details (admin action)
app.get('/api/admin/users/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  let table = '';
  let selectSql = '';
  if (type === 'donor') {
    table = 'donor';
    selectSql = 'SELECT id, fullname AS name, email, status FROM donor WHERE id = ?';
  } else if (type === 'charity') {
    table = 'charity';
    selectSql = 'SELECT id, orgname AS name, email, status FROM charity WHERE id = ?';
  } else if (type === 'admin') {
    table = 'admins';
    selectSql = 'SELECT id, fullname AS name, email, status FROM admins WHERE id = ?';
  } else {
    return res.status(400).json({ success: false, message: 'Invalid user type' });
  }
  try {
    const [results] = await pool.query(selectSql, [id]);
    if (!results.length) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: results[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// --- Admin Dashboard Data Endpoints ---
app.get('/api/admin/dashboard-data', async (req, res) => {
  try {
    // Total users (donors + charities)
    const [donorCountRows] = await pool.query('SELECT COUNT(*) as count FROM donor');
    const [charityCountRows] = await pool.query('SELECT COUNT(*) as count FROM charity');
    const totalUsers = (donorCountRows[0]?.count || 0) + (charityCountRows[0]?.count || 0);
    // Total donations (from donor side)
    const [donationsRows] = await pool.query('SELECT COUNT(*) as count FROM donations');
    // Total charity verifications
    const [verificationsRows] = await pool.query('SELECT COUNT(*) as count FROM charity_verifications');
    // Active charities
    const [activeCharitiesRows] = await pool.query('SELECT COUNT(*) as count FROM charity WHERE status = "active"');
    // Banned users (donors + charities)
    const [bannedDonorRows] = await pool.query('SELECT COUNT(*) as count FROM donor WHERE status = "banned"');
    const [bannedCharityRows] = await pool.query('SELECT COUNT(*) as count FROM charity WHERE status = "banned"');
    const bannedUsers = (bannedDonorRows[0]?.count || 0) + (bannedCharityRows[0]?.count || 0);
    // Completed donations (where donor has marked as complete)
    const [completedDonationsRows] = await pool.query('SELECT COUNT(*) as count FROM donations WHERE status = "completed"');
    // Pending charity verifications
    const [pendingVerificationsRows] = await pool.query('SELECT COUNT(*) as count FROM charity_verifications WHERE status = "pending"');
    // Resolved complaints
    const [resolvedComplaintsRows] = await pool.query('SELECT COUNT(*) as count FROM complaints WHERE status = "resolved"');
    // Rejected charity verifications
    const [rejectedVerificationsRows] = await pool.query('SELECT COUNT(*) as count FROM charity_verifications WHERE status = "rejected"');
    res.json({
      success: true,
      data: {
        totalUsers,
        totalDonations: donationsRows[0]?.count || 0,
        totalVerifications: verificationsRows[0]?.count || 0,
        activeCharities: activeCharitiesRows[0]?.count || 0,
        bannedUsers,
        completedDonations: completedDonationsRows[0]?.count || 0,
        pendingVerifications: pendingVerificationsRows[0]?.count || 0,
        resolvedComplaints: resolvedComplaintsRows[0]?.count || 0,
        rejectedVerifications: rejectedVerificationsRows[0]?.count || 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
  }
});

// --- Complaints Management Endpoints ---
// Submit a complaint
app.post('/api/complaints', async (req, res) => {
  const { userId, userType, description } = req.body;
  if (!userId || !userType || !description) return res.status(400).json({ success: false, message: 'Missing required fields' });
  const sql = 'INSERT INTO complaints (user_id, user_type, description, status, created_at) VALUES (?, ?, ?, "pending", NOW())';
  try {
    await pool.query(sql, [userId, userType, description]);
    res.json({ success: true, message: 'Complaint submitted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// List complaints (admin)
app.get('/api/admin/complaints', async (req, res) => {
  let sql = 'SELECT * FROM complaints';
  const params = [];
  if (req.query.status && req.query.status !== 'all') {
    sql += ' WHERE status = ?';
    params.push(req.query.status);
  }
  sql += ' ORDER BY created_at DESC';
  try {
    const [results] = await pool.query(sql, params);
    res.json({ success: true, complaints: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Update complaint status (admin)
app.post('/api/admin/complaints/:id/status', async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
  try {
    await pool.query('UPDATE complaints SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'Complaint status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// --- Reports Endpoints ---
// Generate reports (admin)
app.post('/api/admin/reports', async (req, res) => {
  const { type, dateRange } = req.body;
  if (!type || !dateRange) return res.status(400).json({ success: false, message: 'Type and date range are required' });
  let sql = '';
  const params = [];
  if (type === 'userRegistrations') {
    sql = `SELECT DATE(created_at) as date, COUNT(*) as count 
           FROM (SELECT created_at FROM donor UNION ALL SELECT created_at FROM charity) as all_users 
           WHERE DATE(created_at) BETWEEN ? AND ? 
           GROUP BY DATE(created_at)`;
    params.push(dateRange.start, dateRange.end);
  } else if (type === 'donations') {
    sql = `SELECT DATE(created_at) as date, COUNT(*) as count 
           FROM donations 
           WHERE DATE(created_at) BETWEEN ? AND ? 
           GROUP BY DATE(created_at)`;
    params.push(dateRange.start, dateRange.end);
  } else if (type === 'charityVerifications') {
    sql = `SELECT DATE(submitted_at) as date, COUNT(*) as count 
           FROM charity_verifications 
           WHERE DATE(submitted_at) BETWEEN ? AND ? 
           GROUP BY DATE(submitted_at)`;
    params.push(dateRange.start, dateRange.end);
  } else {
    return res.status(400).json({ success: false, message: 'Invalid report type' });
  }
  try {
    const [results] = await pool.query(sql, params);
    res.json({ success: true, report: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// --- Settings Endpoints ---
// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM settings');
    const settings = results.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Update settings
app.post('/api/settings', async (req, res) => {
  const updates = req.body;
  const sql = 'INSERT INTO settings (key, value) VALUES ? ON DUPLICATE KEY UPDATE value = VALUES(value)';
  const values = Object.entries(updates).map(([key, value]) => [key, value]);
  try {
    await pool.query(sql, [values]);
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// --- Notification Endpoints ---
// Get notifications (for admin)
app.get('/api/admin/notifications', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json({ success: true, notifications: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Get notifications (for users)
app.get('/api/notifications', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });
  try {
    const [results] = await pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json({ success: true, notifications: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Mark notification as read
app.post('/api/notifications/:id/read', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// --- Appeal Endpoints ---
// Submit an appeal
app.post('/api/appeals', async (req, res) => {
  const { userId, userType, reason } = req.body;
  if (!userId || !userType || !reason) return res.status(400).json({ success: false, message: 'Missing required fields' });
  const sql = 'INSERT INTO appeals (user_id, user_type, reason, status, created_at) VALUES (?, ?, ?, "pending", NOW())';
  try {
    await pool.query(sql, [userId, userType, reason]);
    res.json({ success: true, message: 'Appeal submitted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// List appeals (admin)
app.get('/api/admin/appeals', async (req, res) => {
  let sql = 'SELECT * FROM appeals';
  const params = [];
  if (req.query.status && req.query.status !== 'all') {
    sql += ' WHERE status = ?';
    params.push(req.query.status);
  }
  sql += ' ORDER BY created_at DESC';
  try {
    const [results] = await pool.query(sql, params);
    res.json({ success: true, appeals: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Update appeal status (admin)
app.post('/api/admin/appeals/:id/status', async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
  try {
    await pool.query('UPDATE appeals SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'Appeal status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// --- Miscellaneous Endpoints ---
// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy' });
});

// POST /api/foodneeds - Add a new food need
app.post('/api/foodneeds', async (req, res) => {
  const { orgName, date, foodItem, quantity, pickupLocation, notes, status } = req.body;
  if (!orgName || !date || !foodItem || !quantity || !pickupLocation) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  const sql = `
    INSERT INTO food_needs (org_name, date, food_item, quantity, pickup_location, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  try {
    await pool.query(sql, [orgName, date, foodItem, quantity, pickupLocation, notes || '', status || 'Pending']);

    // Lookup charity email by orgName
    let charityEmail = null;
    const [charityRows] = await pool.query('SELECT email FROM charity WHERE orgname = ?', [orgName]);
    if (charityRows.length > 0) {
      charityEmail = charityRows[0].email;
    }
    // Send confirmation email if email found
    if (charityEmail) {
      try {
        const { sendFoodNeedConfirmationEmail } = require('./Utils/foodNeedConfirmationEmail');
        await sendFoodNeedConfirmationEmail(charityEmail, orgName, {
          foodItem,
          quantity,
          pickupLocation,
          notes,
          date
        });
      } catch (emailErr) {
        console.error('Failed to send food need confirmation email:', emailErr);
      }
    }
    return res.json({ success: true, message: 'Food need submitted.' });
  } catch (err) {
    console.error('DB error:', err);
    return res.status(500).json({ success: false, message: 'Database error.' });
  }
});


// GET /api/foodneeds?org=ORG_NAME - Get food needs for an org
app.get('/api/foodneeds', async (req, res) => {
  const orgName = req.query.org;
  if (!orgName) {
    return res.status(400).json({ success: false, message: 'Missing org name.' });
  }
  const sql = "SELECT * FROM food_needs WHERE org_name = ? ORDER BY date DESC, id DESC";
  try {
    const [results] = await pool.query(sql, [orgName]);
    return res.json(results);
  } catch (err) {
    console.error('DB error:', err);
    return res.status(500).json({ success: false, message: 'Database error.' });
  }
});
// DELETE /api/foodneeds/:id - Delete a food need by ID
app.delete('/api/foodneeds/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ success: false, message: 'Missing food need ID' });
  const sql = 'DELETE FROM food_needs WHERE id = ?';
  try {
    const [result] = await pool.query(sql, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Food need not found' });
    }
    res.json({ success: true, message: 'Food need deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to delete food need' });
  }
});
// Mark food need as completed (arrived)
app.post('/api/foodneeds/:id/arrived', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('UPDATE food_needs SET status = "Completed" WHERE id = ?', [id]);
    res.json({ success: true, message: 'Marked as completed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});
const donorDashboardStatsRoutes = require('./Routes/donorDashboardStats');
app.use('/api/donor', donorDashboardStatsRoutes(pool));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
