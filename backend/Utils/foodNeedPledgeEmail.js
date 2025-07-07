const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vicbiznetworks@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'khwi oxlj pycg lsev' // Use env var in production
  }
});

/**
 * Send an email to the charity when a donor pledges to fulfill a food need.
 * @param {string} toEmail - Charity's email address
 * @param {string} charityName - Charity's name
 * @param {object} pledge - Pledge details (pickup_location, date, contact_phone, notes, donorName, donorEmail)
 */
async function sendFoodNeedPledgeEmail(toEmail, charityName, pledge) {
  const subject = `A Donor Has Pledged to Fulfill Your Food Request!`;
  const body = `
    <p>Dear ${charityName},</p>
    <p>Good news! A donor has pledged to fulfill your food request. Here are the details:</p>
    <ul>
      <li><b>Pickup Location:</b> ${pledge.pickup_location}</li>
      <li><b>Date of Pickup:</b> ${pledge.date}</li>
      <li><b>Contact Phone:</b> ${pledge.contact_phone}</li>
      <li><b>Additional Notes:</b> ${pledge.notes || 'None'}</li>
      <li><b>Donor Name:</b> ${pledge.donorName || 'N/A'}</li>
      <li><b>Donor Email:</b> ${pledge.donorEmail || 'N/A'}</li>
    </ul>
    <p>Please log in to your FoodShare profile to view the progress of your request and contact the donor if needed.</p>
    <p>Thank you for using FoodShare Nairobi!</p>
    <p><i>This is an automated message from FoodShare Nairobi.</i></p>
  `;
  await transporter.sendMail({
    from: 'vicbiznetworks@gmail.com',
    to: toEmail,
    subject,
    html: body
  });
}

module.exports = { sendFoodNeedPledgeEmail };
