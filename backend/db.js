// MySQL connection pool for use in modular routes
const mysql = require('mysql2/promise');
require('dotenv').config();

const sslOptions = (process.env.DATABASE_SSL === 'true') ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined;
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || '25.18.191.107',
  user: process.env.DATABASE_USER || 'Dexter',
  password: process.env.DATABASE_PASSWORD || 'F00dshare123',
  database: process.env.DATABASE_NAME || 'foodshare_db',
  port: Number(process.env.DATABASE_PORT) || 3306,
  ssl: sslOptions,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


module.exports = pool;
