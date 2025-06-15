// 📁 server.js (full backend for handling signup form)

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const app = express();

// ✅ Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ✅ MySQL DB Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // <-- put your root password here if you have one
    database: 'foodshare_db',
    port: 3307 // <-- add this line for XAMPP if using port 3307
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Connected to foodshare_db');
});

// ✅ Donor Signup Endpoint (using 'donor' table)
app.post('/signup/donor', async (req, res) => {
  const { fullname, email, phone, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use the correct column names from your donor table
    const donorQuery = 'INSERT INTO donor (fullname, email, phone, password) VALUES (?, ?, ?, ?)';
    db.query(donorQuery, [fullname, email, phone, hashedPassword], (err, result) => {
      if (err) {
        console.error('❌ Error inserting donor:', err);
        return res.status(500).json({ success: false, message: err.sqlMessage || 'Email already exists or DB error' });
      }
      return res.status(200).json({ success: true, message: 'Donor account created successfully' });
    });
  } catch (err) {
    console.error('❌ Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Charity Signup Endpoint
app.post('/signup/charity', async (req, res) => {
  const { orgname, email, phone, reg, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table
    const userQuery = 'INSERT INTO users (email, password, role) VALUES (?, ?, ?)';
    db.query(userQuery, [email, hashedPassword, 'charity'], (err, result) => {
      if (err) {
        console.error('❌ Error inserting user:', err);
        return res.status(500).json({ success: false, message: 'Email already exists or DB error' });
      }
      const userId = result.insertId;
      // Insert into charities table
      const charityQuery = 'INSERT INTO charities (user_id, org_name, phone, registration_number) VALUES (?, ?, ?, ?)';
      db.query(charityQuery, [userId, orgname, phone, reg], (err2) => {
        if (err2) {
          console.error('❌ Error inserting charity:', err2);
          return res.status(500).json({ success: false, message: 'Error creating charity profile' });
        }
        return res.status(200).json({ success: true, message: 'Charity account created successfully' });
      });
    });
  } catch (err) {
    console.error('❌ Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Login Endpoint
app.post('/auth/login', (req, res) => {
  const { email, password, role, accessKey } = req.body;
  let query = 'SELECT * FROM users WHERE email = ? AND role = ?';
  db.query(query, [email, role], async (err, results) => {
    if (err) {
      console.error('❌ Login error:', err);
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

// ✅ Start Server
app.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});

app.get('/', (req, res) => {
  res.send('✅ Backend is running — Welcome to FoodShare API');
});

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ message: "Something went wrong." });
});
