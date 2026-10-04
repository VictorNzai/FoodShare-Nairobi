// Run: node backend/Routes/reportGenerator.test.js
// Checks every report type returns a CSV with data rows, using a fake database.
const assert = require('assert');
const express = require('express');

const rowsFor = (sql) => {
  if (/FROM feedback/.test(sql)) return [{ id: 1, donor_name: 'Amina', charity_name: null, category: 'App', rating: 5, comment: 'Good', created_at: '2025-11-16' }];
  if (/FROM charity_verifications/.test(sql)) return [{ id: 1, charity_name: 'Hope', address: 'Nairobi', contact: '0700', status: 'pending', submitted_at: '2025-11-16' }];
  if (/FROM charity c/.test(sql)) return [{ id: 2, name: 'Hope', email: 'h@x.org', type: 'charity', status: 'active', donations_count: 3, total_donations: 3 }];
  if (/FROM donor d/.test(sql)) return [{ id: 1, name: 'Amina', email: 'a@x.org', type: 'donor', status: 'active', donations_count: 4, total_donations: 4 }];
  return [{ id: 1, donor_id: 1, date: '2025-11-16', category: 'Grains', unit: 'kg', count: 2, quantity: 5, total_donations: 2, total_quantity: 5, unique_donors: 1 }];
};

// Same shape mysql2/promise returns: [rows, fields]
require.cache[require.resolve('../db')] = { exports: { query: async (sql) => [rowsFor(sql), []] } };
const app = express().use('/', require('./reportGenerator'));

const expectedRows = { donations: 1, category: 1, users: 2, food: 1, feedback: 1, approvals: 1, top: 2 };

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [type, count] of Object.entries(expectedRows)) {
      const res = await fetch(`${base}/?type=${type}&start=2025-01-01&end=2025-12-31`);
      const lines = (await res.text()).trim().split(/\r?\n/);
      assert.strictEqual(res.status, 200, type);
      assert.strictEqual(lines.length - 1, count, `${type}: data rows`);
      assert.ok(!lines[1].split(',').every((cell) => cell === ''), `${type}: row has values`);
      assert.match(res.headers.get('content-disposition'), /_2025-01-01_to_2025-12-31\.csv"$/, type);
    }
    for (const bad of ['type=food&start=2025-01-01', 'type=food&start=01/01/2025&end=2025-12-31', 'type=food&start=2025-12-31&end=2025-01-01', 'type=nope&start=2025-01-01&end=2025-12-31']) {
      assert.strictEqual((await fetch(`${base}/?${bad}`)).status, 400, bad);
    }
    console.log('reportGenerator: all report types OK');
  } finally {
    server.close();
  }
});
