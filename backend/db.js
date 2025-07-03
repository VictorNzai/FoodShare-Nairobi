// MySQL connection pool for use in modular routes
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '25.18.191.107',
  user: 'Dexter',
  password: 'F00dshare123',
  database: 'foodshare_db',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


module.exports = pool;
