// MySQL connection pool for use in modular routes
const mysql = require('mysql2/promise');
require('dotenv').config();

// Enhanced SSL configuration for production
const sslOptions = (process.env.DATABASE_SSL === 'true') ? { 
  rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' 
} : undefined;

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || '25.18.191.107',
  user: process.env.DATABASE_USER || 'Dexter',
  password: process.env.DATABASE_PASSWORD || 'F00dshare123',
  database: process.env.DATABASE_NAME || 'foodshare_db',
  port: Number(process.env.DATABASE_PORT) || 3306,
  ssl: sslOptions,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Enhanced timeout settings for cloud connections
  acquireTimeout: 60000, // 60 seconds
  timeout: 60000, // 60 seconds
  reconnect: true,
  // Connection retry settings
  retryDelay: 2000,
  maxReconnects: 3
});


module.exports = pool;
