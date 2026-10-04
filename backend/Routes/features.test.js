// Run: node backend/Routes/features.test.js
// Checks the pickup handover rules and that notifications are written, using a fake database.
const assert = require('assert');
const express = require('express');

const offer = { id: 7, donor_id: 3, charity_id: 5, charity_name: 'Hope', food_type: 'Bread', status: 'Pending', pickup_code: null };
const notifications = [];

const query = async (sql, params = []) => {
  if (/INSERT INTO fs_notifications/.test(sql)) { notifications.push(params); return [{}]; }
  if (/SET status = 'Scheduled'/.test(sql)) {
    if (offer.status !== 'Pending') return [{ affectedRows: 0 }];
    Object.assign(offer, { status: 'Scheduled', pickup_at: params[0], pickup_code: params[1] });
    return [{ affectedRows: 1 }];
  }
  if (/SET status = 'Completed'/.test(sql)) { Object.assign(offer, { status: 'Completed', people_fed: params[0] }); return [{ affectedRows: 1 }]; }
  if (/INSERT INTO fs_cases/.test(sql)) return [{ insertId: 1 }];
  if (/FROM donor_offers/.test(sql)) return [[{ ...offer }]];
  return [[]];
};

// Same shape mysql2/promise returns: [rows, fields]
require.cache[require.resolve('../db')] = { exports: { query } };
require.cache[require.resolve('../Database/db')] = { exports: { query } };
const app = express()
  .use(express.json())
  .use('/api/donor-offers', require('./donor_offers'))
  .use('/api', require('./features'));

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const post = (path, body) =>
    fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    // Accepting needs a pickup time, and gives the donor a 6-digit code
    assert.strictEqual((await post('/donor-offers/7/accept', {})).status, 400, 'accept without a time');
    assert.strictEqual((await post('/donor-offers/7/accept', { pickup_at: '2026-10-05T14:00' })).status, 200, 'accept');
    assert.match(offer.pickup_code, /^\d{6}$/);
    assert.strictEqual((await post('/donor-offers/7/accept', { pickup_at: '2026-10-05T15:00' })).status, 409, 'accept twice');

    // The charity never sees the code
    const list = await (await fetch(`${base}/donor-offers/5`)).json();
    assert.ok(!('pickup_code' in list.offers[0]), 'charity list hides the code');
    const single = await (await fetch(`${base}/donor-offers/offer/7`)).json();
    assert.ok(!('pickup_code' in single.offer), 'offer details hide the code');

    // Completing needs the right code
    assert.strictEqual((await post('/donor-offers/7/arrived', { code: '000000x' })).status, 400, 'wrong code');
    assert.strictEqual(offer.status, 'Scheduled');
    assert.strictEqual((await post('/donor-offers/7/arrived', { code: offer.pickup_code, people_fed: '40' })).status, 200, 'right code');
    assert.strictEqual(offer.status, 'Completed');
    assert.strictEqual(offer.people_fed, 40);

    // The donor was told about the acceptance and the collection
    assert.strictEqual(notifications.filter(([type, id]) => type === 'donor' && id === 3).length, 2);

    // Cases: bad input is refused, a good one notifies the admins
    assert.strictEqual((await post('/cases', { kind: 'rant', user_type: 'donor', user_id: 3, description: 'x' })).status, 400);
    assert.strictEqual((await post('/cases', { kind: 'complaint', user_type: 'donor', user_id: 3, description: 'No show' })).status, 200);
    assert.ok(notifications.some(([type]) => type === 'admin'), 'admin notified');
    assert.strictEqual((await post('/admin/cases/1', { status: 'Maybe' })).status, 400);

    console.log('features: pickup handover, notifications and cases OK');
  } finally {
    server.close();
  }
});
