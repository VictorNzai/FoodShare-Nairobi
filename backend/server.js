// 📁 server.js (full backend for handling signup form)

const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
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
  password: '',
  database: 'foodshare_db'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Connected to foodshare_db');
});

// ✅ Donor Signup Endpoint
app.post('/signup/donor', async (req, res) => {
  const { fullname, email, phone, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const query = 'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)';

  db.query(query, [fullname, email, phone, hashedPassword, 'donor'], (err, result) => {
    if (err) {
      console.error('❌ Error inserting donor:', err);
      return res.status(500).json({ success: false, message: 'Error creating donor account' });
    }
    return res.status(200).json({ success: true, message: 'Donor account created successfully' });
  });
});

// ✅ Charity Signup Endpoint
app.post('/signup/charity', async (req, res) => {
  const { orgname, email, phone, reg, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const query = 'INSERT INTO users (org_name, email, phone, reg_number, password, role) VALUES (?, ?, ?, ?, ?, ?)';

  db.query(query, [orgname, email, phone, reg, hashedPassword, 'charity'], (err, result) => {
    if (err) {
      console.error('❌ Error inserting charity:', err);
      return res.status(500).json({ success: false, message: 'Error creating charity account' });
    }
    return res.status(200).json({ success: true, message: 'Charity account created successfully' });
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
