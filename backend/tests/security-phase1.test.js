/**
 * security-phase1.test.js
 * -----------------------
 * Exploit verification tests for Security Phase 1 fixes.
 *
 * These are UNIT-LEVEL tests that verify the security middleware behaves
 * correctly WITHOUT requiring a live database or network connection.
 *
 * Run with: node backend/tests/security-phase1.test.js
 */

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failed++;
  }
}

// ─── Mock Express req/res/next ────────────────────────────────────────────────
function mockReq(body = {}, params = {}, user = {}) {
  return { body: { ...body }, params, user };
}
function mockRes() {
  const r = { _status: 200, _json: null };
  r.status = (s) => { r._status = s; return r; };
  r.json = (j) => { r._json = j; return r; };
  return r;
}
function mockNext(res, state) {
  return (err) => {
    if (err) {
      res.status(err.statusCode || 500).json({ error: true, message: err.message });
    } else {
      state.nextCalled = true;
    }
  };
}

// ─── Load security guards ─────────────────────────────────────────────────────
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const {
  stripProfilePrivilegedFields,
  stripVendorPrivilegedFields,
  validateOrderStatus,
} = require('../middleware/securityGuards');

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 1 — Profile Privilege Escalation
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n🔒 SUITE 1: Profile Privilege Escalation\n');

{
  // Exploit attempt: user sends role=admin with profile update
  const req = mockReq({
    first_name: 'Hacker',
    role: 'admin',
    permissions: ['*'],
    status: 'active',
    loyalty_points: 99999,
    total_orders: 9999,
  });
  const res = mockRes();
  const state = { nextCalled: false };
  stripProfilePrivilegedFields(req, res, mockNext(res, state));

  assert('next() is called (middleware does not block)', state.nextCalled);
  assert('role is stripped from body', !('role' in req.body));
  assert('permissions is stripped from body', !('permissions' in req.body));
  assert('status is stripped from body', !('status' in req.body));
  assert('loyalty_points is stripped from body', !('loyalty_points' in req.body));
  assert('total_orders is stripped from body', !('total_orders' in req.body));
  assert('legitimate first_name is preserved', req.body.first_name === 'Hacker');
}

{
  // Exploit attempt: inject id and email
  const req = mockReq({
    phone: '9876543210',
    email: 'attacker@evil.com',
    id: 'other-user-uuid',
    referral_code: 'FREEREFERRAL',
  });
  const res = mockRes();
  const state = { nextCalled: false };
  stripProfilePrivilegedFields(req, res, mockNext(res, state));

  assert('email is stripped', !('email' in req.body));
  assert('id is stripped', !('id' in req.body));
  assert('referral_code is stripped', !('referral_code' in req.body));
  assert('phone is preserved', req.body.phone === '9876543210');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 2 — Vendor Status Self-Approval
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n🔒 SUITE 2: Vendor Status Self-Approval\n');

{
  // Exploit attempt: vendor tries to approve themselves via store update
  const req = mockReq({
    store_name: 'My Store',
    status: 'approved',
    commission_rate: 0,
    commission_percent: 0,
    pan_card: 'ABCDE1234F',
    bank_account: '123456789',
    approved_by: 'self',
    user_id: 'attacker-uuid',
  });
  const res = mockRes();
  const state = { nextCalled: false };
  stripVendorPrivilegedFields(req, res, mockNext(res, state));

  assert('next() is called', state.nextCalled);
  assert('status is stripped', !('status' in req.body));
  assert('commission_rate is stripped', !('commission_rate' in req.body));
  assert('commission_percent is stripped', !('commission_percent' in req.body));
  assert('pan_card is stripped (immutable once submitted)', !('pan_card' in req.body));
  assert('bank_account is stripped', !('bank_account' in req.body));
  assert('approved_by is stripped', !('approved_by' in req.body));
  assert('user_id is stripped', !('user_id' in req.body));
  assert('store_name is preserved', req.body.store_name === 'My Store');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 3 — Order Status Injection
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n🔒 SUITE 3: Order Status Allowlist\n');

const statusTests = [
  { status: 'Delivered', expectPass: true },
  { status: 'Confirmed', expectPass: true },
  { status: 'Shipped', expectPass: true },
  { status: 'Out for Delivery', expectPass: true },
  { status: 'Cancelled', expectPass: true },
  { status: 'approved', expectPass: false },         // exploit: try to skip to approved
  { status: 'Processing', expectPass: false },       // cannot set backwards
  { status: 'admin', expectPass: false },
  { status: '; DROP TABLE orders;--', expectPass: false }, // SQL injection attempt
  { status: '', expectPass: false },
  { status: undefined, expectPass: false },
];

for (const { status, expectPass } of statusTests) {
  const req = mockReq({ status }, { id: 'test-order-id' }, { role: 'admin' });
  const res = mockRes();
  const state = { nextCalled: false };
  validateOrderStatus(req, res, mockNext(res, state));

  if (expectPass) {
    assert(`"${status}" is accepted`, state.nextCalled && res._status === 200);
  } else {
    assert(`"${status ?? 'undefined'}" is rejected with 400`, !state.nextCalled && res._status === 400);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════════
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  console.error('\n⚠️  Some exploit verification tests FAILED — review security guards!');
  process.exit(1);
} else {
  console.log('\n🛡️  All exploit verification tests PASSED');
}
