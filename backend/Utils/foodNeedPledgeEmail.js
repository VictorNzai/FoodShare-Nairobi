const { sendEmail, emailLayout, emailDetails, escapeHtml } = require('./mailer');

/**
 * Send an email to the charity when a donor pledges to fulfill a food need.
 * @param {string} toEmail - Charity's email address
 * @param {string} charityName - Charity's name
 * @param {object} pledge - Pledge details (pickup_location, date, contact_phone, notes, donorName, donorEmail)
 */
async function sendFoodNeedPledgeEmail(toEmail, charityName, pledge) {
  await sendEmail({
    to: toEmail,
    subject: 'A Donor Has Pledged to Fulfill Your Food Request!',
    html: emailLayout({
      heading: 'A donor has pledged to fulfill your request',
      body: `<p style="margin:0 0 12px;">Dear ${escapeHtml(charityName)},</p>
    <p style="margin:0;">Good news! A donor has pledged to fulfill your food request. Here are the details:</p>
    ${emailDetails([
      ['Pickup Location', pledge.pickup_location],
      ['Date of Pickup', pledge.date],
      ['Contact Phone', pledge.contact_phone],
      ['Additional Notes', pledge.notes || 'None']
    ])}
    <p style="margin:0 0 12px;">Please log in to your FoodShare profile to view the progress of your request.</p>
    <p style="margin:0 0 12px;">Thank you for using FoodShare Nairobi!</p>
    <p style="margin:0;color:#4b5540;font-size:13px;">This is an automated message from FoodShare Nairobi.</p>`
    }),
    provider: process.env.EMAIL_PROVIDER_PLEDGE || undefined
  });
}

module.exports = { sendFoodNeedPledgeEmail };
