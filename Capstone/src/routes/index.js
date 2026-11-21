const express = require('express');
const { body, param, query } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');
const Announcement = require('../models/Announcement');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const resource = require('../controllers/resourceController');
const academic = require('../controllers/academicController');
const auth = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const idCheck = param('id').isMongoId().withMessage('Invalid id');
const requiredText = (field, max = 160) => body(field).trim().notEmpty().isLength({ max });
const asyncAdminCreateUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, studentId, department } = req.body;
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role, studentId, department });
  res.status(201).json({ success: true, data: user });
});
const attendanceList = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'student') filter.student = req.user.id;
  if (req.user.role === 'faculty') {
    const sections = await Section.find({ faculty: req.user.id }).distinct('_id');
    filter.section = { $in: sections };
  }
  if (req.query.section) {
    if (req.user.role === 'faculty' && !filter.section.$in.some((id) => String(id) === req.query.section)) return res.status(403).json({ success: false, error: { message: 'Section is not assigned to you' } });
    filter.section = req.query.section;
  }
  if (req.query.student && req.user.role !== 'student') filter.student = req.query.student;
  if (req.query.date) {
    const start = new Date(req.query.date); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    filter.sessionDate = { $gte: start, $lt: end };
  }
  const items = await Attendance.find(filter).populate('student', 'name studentId').populate('section', 'name course').sort({ sessionDate: -1 }).limit(Math.min(100, Number(req.query.limit) || 50));
  res.json({ success: true, data: items });
});

router.post('/auth/register', [requiredText('name', 100), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8, max: 128 }), body('studentId').optional().trim(), body('department').optional().trim(), validate], auth.register);
router.post('/auth/login', [body('email').isEmail().normalizeEmail(), body('password').notEmpty(), validate], auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', protect, auth.me);
router.patch('/auth/me', protect, [body('name').optional().trim().isLength({ min: 1, max: 100 }), body('department').optional().trim().isLength({ max: 100 }), validate], asyncHandler(async (req, res) => {
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.department !== undefined) updates.department = req.body.department;
  const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true });
  res.json({ success: true, data: user });
}));

router.route('/users').get(protect, authorize('admin'), resource.list(User)).post(protect, authorize('admin'), [requiredText('name', 100), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8, max: 128 }), body('role').isIn(['admin', 'faculty', 'student']), validate], asyncAdminCreateUser);
router.route('/users/:id').all(protect, authorize('admin'), idCheck, validate).get(resource.get(User)).patch([body('name').optional().trim().isLength({ min: 1, max: 100 }), body('role').optional().isIn(['admin', 'faculty', 'student']), body('active').optional().isBoolean(), body('department').optional().trim(), validate], resource.update(User)).delete(resource.remove(User));

const courseRules = [requiredText('code', 20), requiredText('title', 160), requiredText('department', 100), body('credits').optional().isInt({ min: 1, max: 12 }), validate];
router.route('/courses').get(protect, resource.list(Course)).post(protect, authorize('admin'), courseRules, resource.create(Course));
router.route('/courses/:id').all(protect, idCheck, validate).get(resource.get(Course)).patch(authorize('admin'), [body('code').optional().trim().isLength({ min: 2, max: 20 }), body('title').optional().trim().isLength({ min: 1, max: 160 }), body('description').optional().isLength({ max: 2000 }), body('department').optional().trim(), body('credits').optional().isInt({ min: 1, max: 12 }), validate], resource.update(Course)).delete(authorize('admin'), resource.remove(Course));

const sectionRules = [body('course').isMongoId(), body('faculty').isMongoId(), requiredText('name', 40), requiredText('term', 40), body('capacity').optional().isInt({ min: 1, max: 500 }), validate];
router.route('/sections').get(protect, resource.list(Section, 'course faculty')).post(protect, authorize('admin'), sectionRules, academic.createSection);
router.route('/sections/:id').all(protect, idCheck, validate).get(resource.get(Section, 'course faculty')).patch(authorize('admin'), [body('course').optional().isMongoId(), body('name').optional().trim().isLength({ min: 1, max: 40 }), body('faculty').optional().isMongoId(), body('capacity').optional().isInt({ min: 1, max: 500 }), validate], academic.updateSection).delete(authorize('admin'), resource.remove(Section));

router.route('/enrollments').get(protect, academic.listEnrollments).post(protect, authorize('admin', 'student'), [body('student').optional().isMongoId(), body('section').isMongoId(), validate], academic.enroll);
router.get('/enrollments/:id', protect, idCheck, validate, academic.getEnrollment);
router.patch('/enrollments/:id', protect, authorize('admin'), idCheck, [body('status').isIn(['enrolled', 'dropped']), validate], academic.updateEnrollment);
router.delete('/enrollments/:id', protect, authorize('admin'), idCheck, validate, academic.removeEnrollment);

router.post('/attendance', protect, authorize('faculty', 'admin'), [body('section').isMongoId(), body('sessionDate').isISO8601(), body('records').isArray({ min: 1 }), body('records.*.student').isMongoId(), body('records.*.status').isIn(['present', 'absent', 'late']), validate], academic.markAttendance);
router.get('/attendance', protect, attendanceList);
router.get('/attendance/summary', protect, academic.attendanceSummary);
router.get('/attendance/:id', protect, idCheck, validate, academic.getAttendance);
router.patch('/attendance/:id', protect, authorize('faculty', 'admin'), idCheck, [body('status').isIn(['present', 'absent', 'late']), body('correctionNote').trim().notEmpty().isLength({ max: 500 }), validate], academic.correctAttendance);
router.delete('/attendance/:id', protect, authorize('admin'), idCheck, validate, academic.deleteAttendance);
router.get('/reports/low-attendance', protect, authorize('admin', 'faculty'), [query('threshold').optional().isFloat({ min: 0, max: 100 }), validate], academic.lowAttendance);
router.get('/reports/enrollments', protect, authorize('admin', 'faculty'), academic.courseEnrollmentReport);

router.route('/announcements').get(protect, academic.listAnnouncements).post(protect, authorize('admin', 'faculty'), [requiredText('title', 160), requiredText('body', 5000), body('audience').isIn(['university', 'section', 'course']), body('section').optional().isMongoId(), body('course').optional().isMongoId(), validate], academic.createAnnouncement);
router.route('/announcements/:id').all(protect, authorize('admin'), idCheck, validate).get(resource.get(Announcement, 'createdBy')).patch([body('title').optional().trim().isLength({ min: 1, max: 160 }), body('body').optional().trim().isLength({ min: 1, max: 5000 }), validate], resource.update(Announcement)).delete(resource.remove(Announcement));

module.exports = router;
