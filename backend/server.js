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

// Donor Login (dedicated endpoint)
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

// Charity Login (dedicated endpoint)
app.post('/auth/login/charity', (req, res) => {
  const { email, password } = req.body;
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

// --- Admin User Management Endpoints ---
// List users (with optional type, search, status)
app.get('/api/admin/users', (req, res) => {
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
  pool.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    res.json({ success: true, users: results });
  });
});

// Ban user (admin action)
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
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User banned.' });
  });
});

// Unban user (admin action)
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
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User unbanned.' });
  });
});

// Promote user to admin (for donor/charity)
app.post('/api/admin/users/:type/:id/promote', (req, res) => {
  const { type, id } = req.params;
  let selectSql = '';
  if (type === 'donor') selectSql = 'SELECT * FROM donor WHERE id = ?';
  else if (type === 'charity') selectSql = 'SELECT * FROM charity WHERE id = ?';
  else return res.status(400).json({ success: false, message: 'Invalid user type' });
  pool.query(selectSql, [id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    const user = results[0];
    // Insert into admins table
    const insertSql = 'INSERT INTO admins (fullname, email, status, password) VALUES (?, ?, ?, ?)';
    pool.query(insertSql, [user.fullname || user.orgname, user.email, 'active', user.password], (err2) => {
      if (err2) return res.status(500).json({ success: false, message: 'Failed to promote user.' });
      res.json({ success: true, message: 'User promoted to admin.' });
    });
  });
});

// Demote admin (remove from admins table)
app.post('/api/admin/users/admin/:id/demote', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM admins WHERE id = ?';
  pool.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'Admin demoted/removed.' });
  });
});

// Delete user (admin action)
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
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User deleted.' });
  });
});

// View user details (admin action)
app.get('/api/admin/users/:type/:id', (req, res) => {
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
  pool.query(selectSql, [id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: results[0] });
  });
});

// --- Admin Dashboard Data Endpoints ---
app.get('/api/admin/dashboard-data', (req, res) => {
  const data = {};
  // Total users (donors + charities)
  const totalUsersPromise = new Promise((resolve, reject) => {
    pool.query('SELECT COUNT(*) as count FROM donor UNION SELECT COUNT(*) as count FROM charity', (err, results) => {
      if (err) return reject(err);
      const total = results.reduce((sum, row) => sum + row.count, 0);
      resolve(total);
    });
  });
  // Total donations (from donor side)
  const totalDonationsPromise = new Promise((resolve, reject) => {
    pool.query('SELECT COUNT(*) as count FROM donations', (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.count || 0);
    });
  });
  // Total charity verifications
  const totalVerificationsPromise = new Promise((resolve, reject) => {
    pool.query('SELECT COUNT(*) as count FROM charity_verifications', (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.count || 0);
    });
  });
  // Active charities
  const activeCharitiesPromise = new Promise((resolve, reject) => {
    pool.query('SELECT COUNT(*) as count FROM charity WHERE status = "active"', (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.count || 0);
    });
  });
  // Banned users (donors + charities)
  const bannedUsersPromise = new Promise((resolve, reject) => {
    pool.query('SELECT COUNT(*) as count FROM donor WHERE status = "banned" UNION SELECT COUNT(*) as count FROM charity WHERE status = "banned"', (err, results) => {
      if (err) return reject(err);
      const totalBanned = results.reduce((sum, row) => sum + row.count, 0);
      resolve(totalBanned);
    });
  });
  // Completed donations (where donor has marked as complete)
  const completedDonationsPromise = new Promise((resolve, reject) => {
    pool.query('SELECT COUNT(*) as count FROM donations WHERE status = "completed"', (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.count || 0);
    });
  });
  // Pending charity verifications
  const pendingVerificationsPromise = new Promise((resolve, reject) => {
    pool.query('SELECT COUNT(*) as count FROM charity_verifications WHERE status = "pending"', (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.count || 0);
    });
  });
  // Resolved complaints
  const resolvedComplaintsPromise = new Promise((resolve, reject) => {
    pool.query('SELECT COUNT(*) as count FROM complaints WHERE status = "resolved"', (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.count || 0);
    });
  });
  // Rejected charity verifications
  const rejectedVerificationsPromise = new Promise((resolve, reject) => {
    pool.query('SELECT COUNT(*) as count FROM charity_verifications WHERE status = "rejected"', (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.count || 0);
    });
  });
  Promise.all([
    totalUsersPromise,
    totalDonationsPromise,
    totalVerificationsPromise,
    activeCharitiesPromise,
    bannedUsersPromise,
    completedDonationsPromise,
    pendingVerificationsPromise,
    resolvedComplaintsPromise,
    rejectedVerificationsPromise
  ])
    .then(results => {
      res.json({
        success: true,
        data: {
          totalUsers: results[0],
          totalDonations: results[1],
          totalVerifications: results[2],
          activeCharities: results[3],
          bannedUsers: results[4],
          completedDonations: results[5],
          pendingVerifications: results[6],
          resolvedComplaints: results[7],
          rejectedVerifications: results[8]
        }
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
    });
});

// --- Complaints Management Endpoints ---
// Submit a complaint
app.post('/api/complaints', (req, res) => {
  const { userId, userType, description } = req.body;
  if (!userId || !userType || !description) return res.status(400).json({ success: false, message: 'Missing required fields' });
  const sql = 'INSERT INTO complaints (user_id, user_type, description, status, created_at) VALUES (?, ?, ?, "pending", NOW())';
  pool.query(sql, [userId, userType, description], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, message: 'Complaint submitted successfully' });
  });
});

// List complaints (admin)
app.get('/api/admin/complaints', (req, res) => {
  let sql = 'SELECT * FROM complaints';
  const params = [];
  if (req.query.status && req.query.status !== 'all') {
    sql += ' WHERE status = ?';
    params.push(req.query.status);
  }
  sql += ' ORDER BY created_at DESC';
  pool.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, complaints: results });
  });
});

// Update complaint status (admin)
app.post('/api/admin/complaints/:id/status', (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
  const sql = 'UPDATE complaints SET status = ? WHERE id = ?';
  pool.query(sql, [status, id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, message: 'Complaint status updated' });
  });
});

// --- Reports Endpoints ---
// Generate reports (admin)
app.post('/api/admin/reports', (req, res) => {
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
  pool.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, report: results });
  });
});

// --- Settings Endpoints ---
// Get settings
app.get('/api/settings', (req, res) => {
  pool.query('SELECT * FROM settings', (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    const settings = results.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json({ success: true, settings });
  });
});

// Update settings
app.post('/api/settings', (req, res) => {
  const updates = req.body;
  const sql = 'INSERT INTO settings (key, value) VALUES ? ON DUPLICATE KEY UPDATE value = VALUES(value)';
  const values = Object.entries(updates).map(([key, value]) => [key, value]);
  pool.query(sql, [values], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, message: 'Settings updated' });
  });
});

// --- Notification Endpoints ---
// Get notifications (for admin)
app.get('/api/admin/notifications', (req, res) => {
  pool.query('SELECT * FROM notifications ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, notifications: results });
  });
});

// Get notifications (for users)
app.get('/api/notifications', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });
  pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, notifications: results });
  });
});

// Mark notification as read
app.post('/api/notifications/:id/read', (req, res) => {
  const id = req.params.id;
  pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, message: 'Notification marked as read' });
  });
});

// --- Appeal Endpoints ---
// Submit an appeal
app.post('/api/appeals', (req, res) => {
  const { userId, userType, reason } = req.body;
  if (!userId || !userType || !reason) return res.status(400).json({ success: false, message: 'Missing required fields' });
  const sql = 'INSERT INTO appeals (user_id, user_type, reason, status, created_at) VALUES (?, ?, ?, "pending", NOW())';
  pool.query(sql, [userId, userType, reason], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, message: 'Appeal submitted successfully' });
  });
});

// List appeals (admin)
app.get('/api/admin/appeals', (req, res) => {
  let sql = 'SELECT * FROM appeals';
  const params = [];
  if (req.query.status && req.query.status !== 'all') {
    sql += ' WHERE status = ?';
    params.push(req.query.status);
  }
  sql += ' ORDER BY created_at DESC';
  pool.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, appeals: results });
  });
});

// Update appeal status (admin)
app.post('/api/admin/appeals/:id/status', (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
  const sql = 'UPDATE appeals SET status = ? WHERE id = ?';
  pool.query(sql, [status, id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    res.json({ success: true, message: 'Appeal status updated' });
  });
});

// --- Miscellaneous Endpoints ---
// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy' });
});

// POST /api/foodneeds - Add a new food need
app.post('/api/foodneeds', (req, res) => {
  const { orgName, date, foodItem, quantity, pickupLocation, notes, status } = req.body;
  if (!orgName || !date || !foodItem || !quantity || !pickupLocation) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  const sql = `
    INSERT INTO food_needs (org_name, date, food_item, quantity, pickup_location, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  pool.query(sql, [orgName, date, foodItem, quantity, pickupLocation, notes || '', status || 'Pending'], (err, result) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    return res.json({ success: true, message: 'Food need submitted.' });
  });
});


// GET /api/foodneeds?org=ORG_NAME - Get food needs for an org
app.get('/api/foodneeds', (req, res) => {
  const orgName = req.query.org;
  if (!orgName) {
    return res.status(400).json({ success: false, message: 'Missing org name.' });
  }
  const sql = "SELECT * FROM food_needs WHERE org_name = ? ORDER BY date DESC, id DESC";
  pool.query(sql, [orgName], (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    return res.json(results);
  });
});
// DELETE /api/foodneeds/:id - Delete a food need by ID
app.delete('/api/foodneeds/:id', (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ success: false, message: 'Missing food need ID' });
  const sql = 'DELETE FROM food_needs WHERE id = ?';
  pool.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Failed to delete food need' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Food need not found' });
    }
    res.json({ success: true, message: 'Food need deleted' });
  });
});
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
