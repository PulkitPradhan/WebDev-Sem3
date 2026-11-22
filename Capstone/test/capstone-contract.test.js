'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('students can only list their own enrollments', () => {
  const routes = read('src/routes/index.js');
  const controller = read('src/controllers/academicController.js');
  assert.match(routes, /router\.route\('\/enrollments'\)\.get\(protect, academic\.listEnrollments\)/);
  assert.match(controller, /if \(req\.user\.role === 'student'\) filter\.student = req\.user\.id/);
});

test('faculty attendance summary is scoped to assigned sections', () => {
  const controller = read('src/controllers/academicController.js');
  assert.match(controller, /sectionIds = await Section\.find\(\{ faculty: req\.user\.id \}\)\.distinct\('_id'\)/);
  assert.match(controller, /if \(sectionIds\) match\.section = \{ \$in: sectionIds \}/);
});

test('duplicate attendance is rejected and partial roster inserts are rolled back', () => {
  const controller = read('src/controllers/academicController.js');
  assert.match(controller, /Attendance\.countDocuments\(\{ section, sessionDate: date, student: \{ \$in: studentIds \} \}\)/);
  assert.match(controller, /const saved = await Attendance\.create\(document\)/);
  assert.match(controller, /Attendance\.deleteMany\(\{ _id: \{ \$in: insertedIds \} \}\)/);
  assert.match(controller, /Attendance already exists for at least one student in this class session/);
});

test('section seat counter is rebuilt from active enrollments', () => {
  const helper = read('src/utils/enrollmentCounters.js');
  const server = read('src/server.js');
  assert.match(helper, /\$match: \{ status: 'enrolled' \}/);
  assert.match(server, /await rebuildEnrollmentCounts\(\)/);
});

test('capacity cannot be reduced below active enrollment count', () => {
  const controller = read('src/controllers/academicController.js');
  assert.match(controller, /filter\.\$expr = \{ \$lte: \['\$enrolledCount', Number\(req\.body\.capacity\)\] \}/);
  assert.match(controller, /Capacity cannot be lower than the active enrollment count/);
});

test('major enrollment and attendance entities expose item CRUD routes', () => {
  const routes = read('src/routes/index.js');
  for (const method of ['get', 'patch', 'delete']) {
    assert.match(routes, new RegExp(`router\\.${method}\\('/enrollments/:id'`));
    assert.match(routes, new RegExp(`router\\.${method}\\('/attendance/:id'`));
  }
});

test('unexpected server errors do not expose internal messages', () => {
  const handler = read('src/middleware/errorHandler.js');
  assert.match(handler, /message = 'Internal server error'/);
  assert.match(handler, /details = undefined/);
});

test('section creation does not trust a client-supplied seat counter', () => {
  const controller = read('src/controllers/academicController.js');
  assert.match(controller, /Do not accept the internal enrolledCount capacity counter/);
  assert.match(controller, /course: course\._id,[\s\S]*faculty: faculty\._id,[\s\S]*name: req\.body\.name/);
  assert.doesNotMatch(controller, /Section\.create\(req\.body\)/);
});

test('low-attendance report accepts a zero-percent threshold', () => {
  const controller = read('src/controllers/academicController.js');
  assert.match(controller, /req\.query\.threshold === undefined \? configuredThreshold : Number\(req\.query\.threshold\)/);
  assert.match(controller, /Math\.max\(0, Math\.min\(100, requestedThreshold\)\)/);
});

test('Postman regression collection and OpenAPI contract are included', () => {
  const fs = require('node:fs');
  const collection = JSON.parse(read('postman/Campus-Management.postman_collection.json'));
  assert.equal(collection.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
  assert.ok(fs.statSync(path.join(root, 'docs/openapi.yaml')).size > 1000);
});
