const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Base URL for password reset links
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

//  Direct DB connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
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
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const resetLink = `${baseUrl}/reset-password.html?token=${token}&role=${role}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset - FoodShare',
      html: `<p>You requested a password reset. 
              <a href="${resetLink}">Click here to reset</a>. Link expires in 1 hour.<br>
              If the link doesn’t work, copy and paste this token into the reset form:<br>
              <code>${token}</code></p>`
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
