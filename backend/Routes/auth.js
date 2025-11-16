const express = require('express');
const router = express.Router();
const db = require('../db'); // Use the connection pool
require('dotenv').config();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Base URL for password reset links
const baseUrl = process.env.BASE_URL || 'https://foodshare-nairobi-1.onrender.com';

//Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, role } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const expireTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const table = role === 'donor' ? 'donor' : 'charity';

    const query = `UPDATE ${table} SET reset_token = ?, reset_expires = ? WHERE email = ?`;
    const [result] = await db.query(query, [token, expireTime, email]);
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'User not found or error occurred.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'vicbiznetworks@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'khwi oxlj pycg lsev'
      }
    });

    const resetLink = `${baseUrl}/reset-password.html?token=${token}&role=${role}`;
    const mailOptions = {
      from: process.env.EMAIL_USER || 'vicbiznetworks@gmail.com',
      to: email,
      subject: 'Password Reset - FoodShare',
      html: `<p>You requested a password reset. 
              <a href="${resetLink}">Click here to reset</a>. Link expires in 1 hour.<br>
              If the link doesn't work, copy and paste this token into the reset form:<br>
              <code>${token}</code></p>`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Password reset link sent to email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to send email.' });
  }
});

//  Reset Password Route
router.post('/reset-password', async (req, res) => {
  try {
    const { token, role, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const table = role === 'donor' ? 'donor' : 'charity';
    const query = `SELECT * FROM ${table} WHERE reset_token = ? AND reset_expires > NOW()`;

    const [results] = await db.query(query, [token]);
    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const updateQuery = `UPDATE ${table} SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?`;

    await db.query(updateQuery, [hashed, results[0].id]);
    res.json({ message: 'Password reset successful.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
