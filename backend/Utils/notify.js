const db = require('../db');

// Pages a notification can point at
const LINKS = {
  donorDonations: '/Food%20Donor%20Pages/Donations.html',
  donorReports: '/Food%20Donor%20Pages/Feedback.html',
  charityOffers: '/Charity%20Pages/BrowseDonorOffers.html',
  charityRequests: '/Charity%20Pages/Requests.html',
  charityReports: '/Charity%20Pages/Feedback.html',
  adminCases: '#cases-section',
  adminVerifications: '#charity-verification-section'
};

// All admins share one inbox
const ADMIN_ID = 0;

/**
 * Add a notification to a user's inbox. Never throws: a failed notification
 * must not fail the action that caused it.
 * @param {'donor'|'charity'|'admin'} userType
 * @param {number} userId
 * @param {string} message
 * @param {string} [link]
 */
async function notify(userType, userId, message, link = null) {
  if (userId === undefined || userId === null) return;
  try {
    await db.query(
      'INSERT INTO fs_notifications (user_type, user_id, message, link) VALUES (?, ?, ?, ?)',
      [userType, userId, String(message).slice(0, 255), link]
    );
  } catch (err) {
    console.error('Failed to save notification:', err.message);
  }
}

module.exports = { notify, LINKS, ADMIN_ID };
