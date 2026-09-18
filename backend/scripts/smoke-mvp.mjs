import assert from 'node:assert/strict';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000/api/v1';
async function call(path, { method = 'GET', token, body, key, expected = 200 } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(json)}`);
  return json;
}
async function login(email) {
  const result = await call('/auth/login', { method: 'POST', body: { email, password: 'sportzfy123' } });
  assert.ok(result.data.token);
  return result.data.token;
}
function dhakaDate(offset) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offset * 86400000));
}

const guest = await call('/turfs?limit=30');
assert.ok(Array.isArray(guest.data) && guest.data.length);
assert.ok(guest.page);
const publicMatches = await call('/matches?limit=30');
assert.ok(Array.isArray(publicMatches.data));
for (const match of publicMatches.data) {
  assert.equal(match.hostUser?.phone, undefined);
  for (const request of match.joinRequests || []) assert.equal(request.user?.phone, undefined);
}

const [player, owner, admin] = await Promise.all([
  login('player@sportzfy.com'), login('owner@sportzfy.com'), login('admin@sportzfy.com'),
]);
await call('/admin/users?limit=5', { token: player, expected: 403 });
assert.ok(Array.isArray((await call('/admin/users?limit=5', { token: admin })).data));
assert.ok(Array.isArray((await call('/admin/bookings?limit=5', { token: admin })).data));

let chosen;
for (const turf of guest.data) {
  for (let offset = 1; offset < 14; offset++) {
    const result = await call(`/turfs/${turf.id}/availability?date=${dhakaDate(offset)}`);
    const slot = result.data.slots.find(item => item.status === 'AVAILABLE');
    if (slot) { chosen = { turf, slot }; break; }
  }
  if (chosen) break;
}
assert.ok(chosen, 'Seed must contain one available future slot');
const hold = (await call('/holds', { method: 'POST', token: player, body: { turfId: chosen.turf.id, startTime: chosen.slot.startTime, endTime: chosen.slot.endTime }, expected: 201 })).data;
assert.equal(hold.paymentMode, 'DEMO');
const key = `ci-smoke-${Date.now()}`;
const confirmed = (await call('/bookings', { method: 'POST', token: player, key, body: { holdId: hold.id, paymentMethod: 'BKASH' }, expected: 201 })).data;
const replay = (await call('/bookings', { method: 'POST', token: player, key, body: { holdId: hold.id, paymentMethod: 'BKASH' } })).data;
assert.equal(replay.id, confirmed.id);
const detail = (await call(`/bookings/${confirmed.id}`, { token: player })).data;
assert.equal(detail.id, confirmed.id);
const cancelled = (await call(`/bookings/${confirmed.id}/cancel`, { method: 'POST', token: player, body: { reason: 'CI smoke test cancellation' } })).data;
assert.equal(cancelled.status, 'CANCELLED');

const draft = (await call('/owner/turfs', { method: 'POST', token: owner, expected: 201, body: {
  draft: true, name: 'CI Smoke Venue', city: 'Chattogram', area: 'Test Area', address: 'Test Address',
  description: 'Temporary CI venue', pitchFormats: '7v7', basePricePerHour: 1500,
  coverImage: 'https://example.com/cover.jpg', imageUrls: ['https://example.com/gallery.jpg'],
} })).data;
await call(`/owner/turfs/${draft.id}/submit`, { method: 'POST', token: owner, body: {} });
const queued = (await call('/admin/turfs', { token: admin })).data;
assert.ok(queued.some(item => item.id === draft.id && item.status === 'PENDING_REVIEW'));
await call(`/admin/turfs/${draft.id}/review`, { method: 'POST', token: admin, body: { status: 'APPROVED' } });
await call(`/owner/turfs/${draft.id}`, { method: 'PATCH', token: owner, body: { name: 'CI Smoke Venue Revision' } });
const proposed = (await call(`/admin/turfs/${draft.id}`, { token: admin })).data;
assert.equal(proposed.pendingRevision.payload.name, 'CI Smoke Venue Revision');
await call(`/admin/turfs/${draft.id}/review`, { method: 'POST', token: admin, body: { status: 'REJECTED', reason: 'CI smoke review' } });
const live = (await call(`/turfs/${draft.id}`)).data;
assert.equal(live.name, 'CI Smoke Venue');

console.log('Mobile MVP API smoke passed: discovery/privacy, role guards, demo booking/replay/cancel, owner revision/admin decisions.');
