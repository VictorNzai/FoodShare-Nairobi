// --- Admin User Management Endpoints ---
// (Now correctly placed after app initialization and all middleware)
// ...existing code...
// Place these at the end of the file, after all other endpoints:
// (Moved below app.listen)
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
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
const pool = mysql.createPool({
  host: '25.18.191.107',
  user: 'Dexter',
  password: 'F00dshare123',
  database: 'foodshare_db',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
pool.getConnection((err, conn) => {
  if (err) throw err;
  console.log('Connected to foodshare_db');
  conn.release();
});

// --- Admin Charity Verification Endpoints ---
app.get('/api/admin/charity-verifications', (req, res) => {
  let sql = 'SELECT * FROM charity_verifications';
  const params = [];
  if (req.query.status && req.query.status !== 'all') {
    sql += ' WHERE status = ?';
    params.push(req.query.status);
  }
  sql += ' ORDER BY submitted_at DESC';
  pool.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    res.json({ success: true, verifications: results });
  });
});

app.post('/api/admin/charity-verifications/:id/approve', (req, res) => {
  const id = req.params.id;
  // First, approve the verification
  const approveSql = 'UPDATE charity_verifications SET status = "approved" WHERE id = ?';
  pool.query(approveSql, [id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    // Get the charity name from the verification row
    const getCharitySql = 'SELECT charity_name FROM charity_verifications WHERE id = ?';
    pool.query(getCharitySql, [id], (err2, results) => {
      if (err2 || !results.length) return res.json({ success: true, message: 'Charity verification approved, but could not update charity verified status.' });
      const charityName = results[0].charity_name;
      // Update the charity table to set verified = 1
      const updateCharitySql = 'UPDATE charity SET verified = 1 WHERE orgname = ?';
      pool.query(updateCharitySql, [charityName], (err3) => {
        if (err3) return res.json({ success: true, message: 'Charity verification approved, but failed to update charity verified status.' });
        // Also update the charity_verifications table to set verified = 1 for this row
        const updateVerificationSql = 'UPDATE charity_verifications SET verified = 1 WHERE id = ?';
        pool.query(updateVerificationSql, [id], (err4) => {
          if (err4) return res.json({ success: true, message: 'Charity and verification approved, but failed to update verification verified status.' });
          res.json({ success: true, message: 'Charity verification approved and both tables marked as verified.' });
        });
      });
    });
  });
});

app.post('/api/admin/charity-verifications/:id/reject', (req, res) => {
  const id = req.params.id;
  const sql = 'UPDATE charity_verifications SET status = "rejected" WHERE id = ?';
  pool.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    res.json({ success: true, message: 'Charity verification rejected.' });
  });
});

// Donor Signup
app.post('/signup/donor', async (req, res) => {
  const { fullname, email, phone, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO donor (fullname, email, phone, password) VALUES (?, ?, ?, ?)';
    pool.query(query, [fullname, email, phone, hashed], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
      res.status(200).json({ success: true, message: 'Donor account created successfully' });
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Charity Signup
app.post('/signup/charity', async (req, res) => {
  const { orgname, email, phone, reg, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO charity (orgname, email, phone, reg, password) VALUES (?, ?, ?, ?, ?)';
    pool.query(query, [orgname, email, phone, reg, hashed], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.sqlMessage });
      res.status(200).json({ success: true, message: 'Charity account created successfully' });
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login (general)
app.post('/auth/login', (req, res) => {
  const { email, password, role, accessKey } = req.body;
  if (role === 'admin') {
    const query = 'SELECT * FROM admins WHERE email = ?';
    pool.query(query, [email], (err, results) => {
      if (err) return res.status(500).json({ message: 'Server error' });
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
      res.json({
        success: true,
        message: 'Admin login successful',
        admin: { id: results[0].id, fullname: results[0].fullname, email: results[0].email },
        dashboard: '/AdminPages/AdminDashboard.html'
      });
    });
  } else if (role === 'donor') {
    const query = 'SELECT * FROM donor WHERE email = ?';
    pool.query(query, [email], async (err, results) => {
      if (err || results.length === 0) return res.status(401).json({ message: 'Invalid email or password' });
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
      res.json({
        success: true,
        message: 'Donor login successful',
        donor: { id: results[0].id, fullname: results[0].fullname, email: results[0].email, phone: results[0].phone },
        dashboard: '/FoodDonor Pages/FoodDonor.html'
      });
    });
  } else if (role === 'charity') {
    const query = 'SELECT * FROM charity WHERE email = ?';
    pool.query(query, [email], async (err, results) => {
      if (err || results.length === 0) return res.status(401).json({ message: 'Invalid email or password' });
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
      res.json({
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
    });
  } else {
    res.status(400).json({ message: 'Unknown role' });
  }
});

// Donor Login
app.post('/auth/login/donor', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM donor WHERE email = ?';
  pool.query(query, [email], async (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ success: false, message: 'Invalid email or password' });
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
  });
});

// Charity Login
app.post('/auth/login/charity', (req, res) => {
  const { email, password } = req.body;
  // Use charity table
  const query = 'SELECT * FROM charity WHERE email = ?';
  pool.query(query, [email], async (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ success: false, message: 'Invalid email or password' });
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
  });
});

// Submit Charity Verification
app.post('/api/verify-charity', upload.fields([
  { name: 'idUpload', maxCount: 1 },
  { name: 'certUpload', maxCount: 1 }
]), (req, res) => {
  const { charityName, address, contact, desc } = req.body;
  const idFile = req.files['idUpload']?.[0]?.filename;
  const certFile = req.files['certUpload']?.[0]?.filename;

  if (!charityName || !address || !contact || !desc || !idFile || !certFile)
    return res.status(400).json({ success: false, message: 'Missing required fields or files.' });

  const sql = `INSERT INTO charity_verifications 
    (charity_name, address, contact, description, id_file, cert_file, status, submitted_at) 
    VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`;

  pool.query(sql, [charityName, address, contact, desc, idFile, certFile], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    res.json({ success: true, message: 'Verification submitted.' });
  });
});

// Base route
app.get('/', (req, res) => {
  res.send('Backend is running — Welcome to FoodShare API');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  res.status(500).json({ message: 'Something went wrong.' });
});

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

// --- Admin User Management Endpoints ---
// List users (with optional type, search, status)
app.get('/api/admin/users', (req, res) => {
  const { type = 'donor', search = '', status = '' } = req.query;
  let table = '';
  if (type === 'donor') table = 'donor';
  else if (type === 'charity') table = 'charities';
  else if (type === 'admin') table = 'admins';
  else return res.status(400).json({ success: false, message: 'Invalid user type' });

  let sql = '';
  if (type === 'charity') {
    sql = 'SELECT user_id AS id, org_name AS name, email, status FROM charities';
  } else if (type === 'donor') {
    sql = 'SELECT id, fullname AS name, email, status FROM donor';
  } else if (type === 'admin') {
    sql = 'SELECT id, fullname AS name, email, status FROM admins';
  }
  const params = [];
  const where = [];
  if (search) {
    if (type === 'charity') {
      where.push('(org_name LIKE ? OR email LIKE ? OR status LIKE ?)');
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
  pool.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    res.json({ success: true, users: results });
  });
});

// View user details
app.get('/api/admin/users/:type/:id', (req, res) => {
  const { type, id } = req.params;
  let table = '';
  if (type === 'donor') table = 'donor';
  else if (type === 'charity') table = 'charity';
  else if (type === 'admin') table = 'admins';
  else return res.status(400).json({ success: false, message: 'Invalid user type' });
  const sql = `SELECT * FROM ${table} WHERE id = ?`;
  pool.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    if (!results.length) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: results[0] });
  });
});

// Ban user (soft delete)
app.post('/api/admin/users/:type/:id/ban', (req, res) => {
  const { type, id } = req.params;
  let table = '';
  if (type === 'donor') table = 'donor';
  else if (type === 'charity') table = 'charity';
  else if (type === 'admin') table = 'admins';
  else return res.status(400).json({ success: false, message: 'Invalid user type' });
  const sql = `UPDATE ${table} SET status = 'banned' WHERE id = ?`;
  pool.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    res.json({ success: true, message: 'User banned.' });
  });
});

// Unban user
app.post('/api/admin/users/:type/:id/unban', (req, res) => {
  const { type, id } = req.params;
  let table = '';
  if (type === 'donor') table = 'donor';
  else if (type === 'charity') table = 'charity';
  else if (type === 'admin') table = 'admins';
  else return res.status(400).json({ success: false, message: 'Invalid user type' });
  const sql = `UPDATE ${table} SET status = 'active' WHERE id = ?`;
  pool.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    res.json({ success: true, message: 'User unbanned.' });
  });
});

// Permanent delete user
app.delete('/api/admin/users/:type/:id', (req, res) => {
  const { type, id } = req.params;
  let table = '';
  if (type === 'donor') table = 'donor';
  else if (type === 'charity') table = 'charity';
  else if (type === 'admin') table = 'admins';
  else return res.status(400).json({ success: false, message: 'Invalid user type' });
  const sql = `DELETE FROM ${table} WHERE id = ?`;
  pool.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    res.json({ success: true, message: 'User permanently deleted.' });
  });
});

// Promote donor or charity to admin
app.post('/api/admin/users/:type/:id/promote', (req, res) => {
  const { type, id } = req.params;
  let selectSql = '';
  if (type === 'donor') selectSql = 'SELECT fullname, email, phone, password FROM donor WHERE id = ?';
  else if (type === 'charity') selectSql = 'SELECT org_name AS fullname, email, phone, password FROM charities WHERE user_id = ?';
  else return res.status(400).json({ success: false, message: 'Can only promote donor or charity.' });
  pool.query(selectSql, [id], (err, results) => {
    if (err || !results.length) return res.status(404).json({ success: false, message: 'User not found.' });
    const { fullname, email, phone, password } = results[0];
    // Check if already admin
    pool.query('SELECT id FROM admins WHERE email = ?', [email], (err2, adminResults) => {
      if (err2) return res.status(500).json({ success: false, message: 'Database error.' });
      if (adminResults.length) return res.status(400).json({ success: false, message: 'User is already an admin.' });
      // Insert into admins
      const insertSql = 'INSERT INTO admins (fullname, email, phone, password, status) VALUES (?, ?, ?, ?, "active")';
      pool.query(insertSql, [fullname, email, phone, password], (err3) => {
        if (err3) return res.status(500).json({ success: false, message: 'Failed to promote user.' });
        res.json({ success: true, message: 'User promoted to admin.' });
      });
    });
  });
});

// Demote admin (remove from admins table)
app.post('/api/admin/users/admin/:id/demote', (req, res) => {
  const { id } = req.params;
  // Optionally, prevent demoting self
  // Remove from admins table
  pool.query('DELETE FROM admins WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Admin not found.' });
    res.json({ success: true, message: 'Admin demoted/removed.' });
  });
});

// --- Food Needs Endpoints ---
// POST a new food need
app.post('/api/food_needs', (req, res) => {
  const { org_name, date, food_item, quantity, pickup_location, notes, status } = req.body;
  if (!org_name || !date || !food_item || !quantity || !pickup_location || !status) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  const sql = `INSERT INTO food_needs (org_name, date, food_item, quantity, pickup_location, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  pool.query(sql, [org_name, date, food_item, quantity, pickup_location, notes, status], (err, result) => {
    if (err) {
      console.error('Error inserting food need:', err);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    res.json({ success: true, message: 'Food need submitted.' });
  });
});

// GET food needs for a specific org
app.get('/api/food_needs', (req, res) => {
  const org = req.query.org;
  if (!org) return res.status(400).json({ success: false, message: 'Missing org parameter.' });
  const sql = 'SELECT * FROM food_needs WHERE org_name = ? ORDER BY date DESC';
  pool.query(sql, [org], (err, results) => {
    if (err) {
      console.error('Error fetching food needs:', err);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    res.json(results);
  });
});
