const { sendEmail, emailLayout, emailDetails, escapeHtml } = require('./mailer');

/**
 * Send confirmation email to a charity after submitting a food need.
 * @param {string} toEmail - The charity's email address.
 * @param {string} orgName - The name of the charity.
 * @param {object} foodNeed - The food need details (foodItem, quantity, pickupLocation, notes, date).
 * @returns {Promise<void>}
 */
async function sendFoodNeedConfirmationEmail(toEmail, orgName, foodNeed) {
  const details = [
    ['Food Item', foodNeed.foodItem],
    ['Quantity', foodNeed.quantity],
    ['Pickup Location', foodNeed.pickupLocation],
    ['Date Submitted', foodNeed.date]
  ];
  if (foodNeed.notes) details.push(['Notes', foodNeed.notes]);

  await sendEmail({
    to: toEmail,
    subject: 'Your Food Need Has Been Submitted - FoodShare Nairobi',
    html: emailLayout({
      heading: 'Your food need has been submitted',
      body: `<p style="margin:0 0 12px;">Dear <b>${escapeHtml(orgName)}</b>,</p>
           <p style="margin:0;">Your food need has been submitted successfully. We will notify you when a donor has fulfilled your request.</p>
           ${emailDetails(details)}
           <p style="margin:0;">Thank you for using FoodShare Nairobi!</p>`
    }),
    provider: process.env.EMAIL_PROVIDER_CONFIRMATION || undefined
  });
}

module.exports = { sendFoodNeedConfirmationEmail };
