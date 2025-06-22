const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

//  Direct DB connection
const db = mysql.createConnection({
    host: '25.18.191.107',
    user: 'Dexter',
    password: 'F00dshare123',
    database: 'foodshare_db',
    port: 3306
});

db.connect((err) => {
  if (err) throw err;
  console.log('[AUTH ROUTE] Connected to foodshare_db');
});

//Forgot Password Route
router.post('/forgot-password', (req, res) => {
  const { email, role } = req.body;
  const token = crypto.randomBytes(32).toString('hex');
  const expireTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const table = role === 'donor' ? 'donor' : 'charity';

  const query = `UPDATE ${table} SET reset_token = ?, reset_expires = ? WHERE email = ?`;
  db.query(query, [token, expireTime, email], (err, result) => {
    if (err || result.affectedRows === 0) {
      return res.status(400).json({ message: 'User not found or error occurred.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'vicbiznetworks@gmail.com', // use your Gmail
        pass: 'khwi oxlj pycg lsev'     // generated Gmail app password
      }
    });

    const resetLink = `http://localhost:3000/reset-password.html?token=${token}&role=${role}`;
    const mailOptions = {
      from: 'vicbiznetworks@gmail.com',
      to: email,
      subject: 'Password Reset - FoodShare',
      html: `<p>You requested a password reset. <a href="${resetLink}">Click here to reset</a>. Link expires in 1 hour.</p>`
    };

    transporter.sendMail(mailOptions, (emailErr, info) => {
      if (emailErr) {
        return res.status(500).json({ message: 'Failed to send email.' });
      }
      res.json({ message: 'Password reset link sent to email.' });
    });
  });
});

//  Reset Password Route
router.post('/reset-password', async (req, res) => {
  const { token, role, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  const table = role === 'donor' ? 'donor' : 'charity';
  const query = `SELECT * FROM ${table} WHERE reset_token = ? AND reset_expires > NOW()`;

  db.query(query, [token], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const updateQuery = `UPDATE ${table} SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?`;

    db.query(updateQuery, [hashed, results[0].id], (updateErr) => {
      if (updateErr) return res.status(500).json({ message: 'Server error.' });
      res.json({ message: 'Password reset successful.' });
    });
  });
});

module.exports = router;
