const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sendEmail } = require('../Utils/mailer');
require('dotenv').config();

// In-memory store for OTPs (for demo; use DB/Redis in production)
const otps = {};

// Send OTP to email
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps[email] = { otp, expires: Date.now() + 10 * 60 * 1000 }; // 10 min expiry
  await sendEmail({
    to: email,
    subject: 'Your FoodShare Email Verification OTP',
    html: `<p>Your OTP for FoodShare email verification is: <b>${otp}</b></p><p>This code is valid for 10 minutes.</p>`,
    provider: process.env.EMAIL_PROVIDER_OTP || 'provider2'
  });
  res.json({ success: true, message: 'OTP sent to your email.' });
});


// Verify OTP
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required.' });
  const record = otps[email];
  if (!record) return res.status(400).json({ success: false, message: 'No OTP sent to this email.' });
  if (Date.now() > record.expires) {
    delete otps[email];
    return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
  }
  if (record.otp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }
  delete otps[email];
  // TODO: Mark donor as verified in DB here
  return res.json({ success: true, message: 'Email verified successfully.' });
});

module.exports = router;
