const nodemailer = require('nodemailer');

/**
 * Send confirmation email to a charity after submitting a food need.
 * @param {string} toEmail - The charity's email address.
 * @param {string} orgName - The name of the charity.
 * @param {object} foodNeed - The food need details (foodItem, quantity, pickupLocation, notes, date).
 * @returns {Promise<void>}
 */
async function sendFoodNeedConfirmationEmail(toEmail, orgName, foodNeed) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'vicbiznetworks@gmail.com',
      pass: 'khwi oxlj pycg lsev'
    }
  });

  const mailOptions = {
    from: 'vicbiznetworks@gmail.com',
    to: toEmail,
    subject: 'Your Food Need Has Been Submitted - FoodShare Nairobi',
    html: `<p>Dear <b>${orgName}</b>,</p>
           <p>Your food need has been submitted successfully. We will notify you when a donor has fulfilled your request.</p>
           <h4>Food Need Details:</h4>
           <ul>
             <li><b>Food Item:</b> ${foodNeed.foodItem}</li>
             <li><b>Quantity:</b> ${foodNeed.quantity}</li>
             <li><b>Pickup Location:</b> ${foodNeed.pickupLocation}</li>
             <li><b>Date Submitted:</b> ${foodNeed.date}</li>
             ${foodNeed.notes ? `<li><b>Notes:</b> ${foodNeed.notes}</li>` : ''}
           </ul>
           <br><p>Thank you for using FoodShare Nairobi!</p>`
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendFoodNeedConfirmationEmail };
