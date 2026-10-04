// Tables and columns added after the original schema. Runs at startup and is
// safe to run again: tables use IF NOT EXISTS, and an existing column is skipped.
const db = require('../db');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS fs_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_type VARCHAR(10) NOT NULL,
    user_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    link VARCHAR(255),
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fs_notifications_user (user_type, user_id)
  )`,
  // Complaints and appeals share one queue
  `CREATE TABLE IF NOT EXISTS fs_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kind VARCHAR(10) NOT NULL,
    user_type VARCHAR(10) NOT NULL,
    user_id INT NOT NULL,
    user_name VARCHAR(150),
    offer_id INT,
    description TEXT NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'Open',
    outcome TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fs_cases_user (user_type, user_id)
  )`
];

const COLUMNS = [
  // pickup_at is the time as the charity typed it (Nairobi time), e.g. 2026-10-05T14:00
  ['donor_offers', 'pickup_at VARCHAR(16) NULL'],
  ['donor_offers', 'pickup_code CHAR(6) NULL'],
  ['donor_offers', 'people_fed INT NULL'],
  ['donor_offers', 'completed_at DATETIME NULL'],
  ['donor_offers', 'expiry_notified TINYINT(1) NOT NULL DEFAULT 0'],
  ['food_needs', 'urgent TINYINT(1) NOT NULL DEFAULT 0']
];

async function ensureSchema() {
  try {
    for (const sql of TABLES) await db.query(sql);
    for (const [table, column] of COLUMNS) {
      try {
        await db.query(`ALTER TABLE ${table} ADD COLUMN ${column}`);
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
      }
    }
    console.log('✅ Schema ready (notifications, cases, pickup and urgency columns)');
  } catch (err) {
    // Pickup, notification and case features will fail until this is fixed
    console.error('❌ Schema setup failed:', err.message);
  }
}

module.exports = { ensureSchema };
