const { sendEmail, emailLayout, escapeHtml } = require('./mailer');

/**
 * Send approval email to a charity after admin approval.
 * @param {string} toEmail - The charity's email address.
 * @param {string} charityName - The name of the approved charity.
 * @returns {Promise<void>}
 */
async function sendCharityApprovalEmail(toEmail, charityName) {
  await sendEmail({
    to: toEmail,
    subject: 'Your Charity Has Been Approved - FoodShare Nairobi',
    html: emailLayout({
      heading: 'Your charity has been approved',
      body: `<p style="margin:0 0 12px;">Dear <b>${escapeHtml(charityName)}</b>,</p>
           <p style="margin:0 0 12px;">Congratulations! Your information has been reviewed and <b>approved</b> by our admin team.</p>
           <p style="margin:0 0 12px;">You now have access to more features, including posting food donations and connecting with donors.</p>
           <p style="margin:0 0 12px;">Thank you for joining FoodShare Nairobi and making a difference in our community!</p>
           <p style="margin:0;">Best regards,<br>FoodShare Nairobi Team</p>`
    }),
    provider: process.env.EMAIL_PROVIDER_APPROVAL || undefined
  });
}

module.exports = { sendCharityApprovalEmail };
