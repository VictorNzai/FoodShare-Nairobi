// 📁 server.js (full backend for handling signup form)

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const authRoutes = require('../backend/Routes/auth'); // Assuming you have auth routes in this path
const app = express();

//  Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use(express.static(path.join(__dirname, '../frontend')));

//  MySQL DB Connection
const db = mysql.createConnection({
    host: '25.18.191.107',      // your friend's server IP
    user: 'Dexter',             // your friend's MySQL username
    password: 'F00dshare123',   // your friend's MySQL password
    database: 'foodshare_db',   // your friend's database name
    port: 3306                  // default MySQL port
});

db.connect(err => {
  if (err) throw err;
  console.log(' Connected to foodshare_db');
});

//  Donor Signup Endpoint (using 'donor' table)
app.post('/signup/donor', async (req, res) => {
  const { fullname, email, phone, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // If your donor table uses 'email', keep as is. If it's 'mail', change below.
    const donorQuery = 'INSERT INTO donor (fullname, email, phone, password) VALUES (?, ?, ?, ?)';
    db.query(donorQuery, [fullname, email, phone, hashedPassword], (err, result) => {
      if (err) {
        console.error(' Error inserting donor:', err);
        return res.status(500).json({ success: false, message: err.sqlMessage || 'Email already exists or DB error' });
      }
      return res.status(200).json({ success: true, message: 'Donor account created successfully' });
    });
  } catch (err) {
    console.error(' Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

//  Charity Signup Endpoint (using 'charity' table)
app.post('/signup/charity', async (req, res) => {
  const { orgname, email, phone, reg, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const charityQuery = 'INSERT INTO charity (orgname, email, phone, reg, password) VALUES (?, ?, ?, ?, ?)';
    db.query(charityQuery, [orgname, email, phone, reg, hashedPassword], (err, result) => {
      if (err) {
        console.error(' Error inserting charity:', err);
        return res.status(500).json({ success: false, message: err.sqlMessage || 'Email already exists or DB error' });
      }
      return res.status(200).json({ success: true, message: 'Charity account created successfully' });
    });
  } catch (err) {
    console.error(' Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

//  Login Endpoint
app.post('/auth/login', (req, res) => {
  const { email, password, role, accessKey } = req.body;
  let query = 'SELECT * FROM users WHERE email = ? AND role = ?';
  db.query(query, [email, role], async (err, results) => {
    if (err) {
      console.error(' Login error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // If admin, check accessKey
    if (role === 'admin') {
      db.query('SELECT * FROM admins WHERE user_id = ?', [user.id], (err2, adminRows) => {
        if (err2 || adminRows.length === 0) {
          return res.status(401).json({ message: 'Admin not found' });
        }
        if (adminRows[0].access_key !== accessKey) {
          return res.status(401).json({ message: 'Invalid admin access key' });
        }
        return res.json({ message: 'Admin login successful', dashboard: '/admin/dashboard.html' });
      });
    } else if (role === 'donor') {
      return res.json({ message: 'Donor login successful', dashboard: '/donor/dashboard.html' });
    } else if (role === 'charity') {
      return res.json({ message: 'Charity login successful', dashboard: '/charity/dashboard.html' });
    } else {
      return res.status(400).json({ message: 'Unknown role' });
    }
  });
});

//  Donor Login Endpoint
app.post('/auth/login/donor', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM donor WHERE email = ?'; // Use 'mail' if that's your column name
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error' });
    if (results.length === 0) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const donor = results[0];
    const match = await bcrypt.compare(password, donor.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    return res.json({ success: true, message: 'Login successful', donor: { id: donor.id, fullname: donor.fullname, email: donor.email, phone: donor.phone } });
  });
});

//  Charity Login Endpoint
app.post('/auth/login/charity', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM charity WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error' });
    if (results.length === 0) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const charity = results[0];
    const match = await bcrypt.compare(password, charity.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    return res.json({ success: true, message: 'Login successful', charity: { id: charity.id, orgname: charity.orgname, email: charity.email, phone: charity.phone, reg: charity.reg } });
  });
});

//  Start Server
app.listen(3000, () => {
  console.log(' Server running on http://localhost:3000');
});

app.get('/', (req, res) => {
  res.send(' Backend is running — Welcome to FoodShare API');
});

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ message: "Something went wrong." });
});
