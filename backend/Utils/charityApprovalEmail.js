const nodemailer = require('nodemailer');

/**
 * Send approval email to a charity after admin approval.
 * @param {string} toEmail - The charity's email address.
 * @param {string} charityName - The name of the approved charity.
 * @returns {Promise<void>}
 */
async function sendCharityApprovalEmail(toEmail, charityName) {
  // Configure transporter using environment credentials
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Your Charity Has Been Approved - FoodShare Nairobi',
    html: `<p>Dear <b>${charityName}</b>,</p>
           <p>Congratulations! Your information has been reviewed and <b>approved</b> by our admin team.</p>
           <p>You now have access to more features, including posting food donations and connecting with donors.</p>
           <p>Thank you for joining FoodShare Nairobi and making a difference in our community!</p>
           <br><p>Best regards,<br>FoodShare Nairobi Team</p>`
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendCharityApprovalEmail };
