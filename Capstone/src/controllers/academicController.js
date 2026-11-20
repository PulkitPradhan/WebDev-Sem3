const mongoose = require('mongoose');
const Section = require('../models/Section');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const Course = require('../models/Course');
const events = require('../utils/appEvents');
const asyncHandler = require('../utils/asyncHandler');

exports.enroll = asyncHandler(async (req, res) => {
  const { student, section } = req.body;
  const studentId = req.user.role === 'student' ? req.user.id : student;
  if (!studentId) return res.status(400).json({ success: false, error: { message: 'student is required' } });

  const [studentRecord, sectionRecord] = await Promise.all([User.findById(studentId), Section.findById(section)]);
  if (!studentRecord || studentRecord.role !== 'student' || !studentRecord.active) {
    return res.status(400).json({ success: false, error: { message: 'A valid active student account is required' } });
  }
  if (!sectionRecord || !sectionRecord.active) {
    return res.status(404).json({ success: false, error: { message: 'Active section not found' } });
  }

  const existing = await Enrollment.findOne({ student: studentId, section });
  if (existing && existing.status === 'enrolled') {
    return res.status(409).json({ success: false, error: { message: 'Student is already enrolled in this section' } });
  }

  // Reserve capacity atomically before creating/reactivating the enrollment.
  const reserved = await Section.findOneAndUpdate(
    { _id: section, active: true, $expr: { $lt: ['$enrolledCount', '$capacity'] } },
    { $inc: { enrolledCount: 1 } },
    { new: true }
  );
  if (!reserved) return res.status(409).json({ success: false, error: { message: 'Section is full or inactive' } });

  try {
    let enrollment;
    if (existing) {
      enrollment = await Enrollment.findOneAndUpdate(
        { _id: existing._id, status: 'dropped' },
        { $set: { status: 'enrolled', enrolledAt: new Date() } },
        { new: true, runValidators: true }
      );
      if (!enrollment) {
        await Section.updateOne({ _id: section, enrolledCount: { $gt: 0 } }, { $inc: { enrolledCount: -1 } });
        return res.status(409).json({ success: false, error: { message: 'Enrollment changed; please retry' } });
      }
    } else {
      enrollment = await Enrollment.create({ student: studentId, section });
    }
    return res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    await Section.updateOne({ _id: section, enrolledCount: { $gt: 0 } }, { $inc: { enrolledCount: -1 } });
    if (error.code === 11000) return res.status(409).json({ success: false, error: { message: 'Student is already enrolled in this section' } });
    throw error;
  }
});

exports.createSection = asyncHandler(async (req, res) => {
  const [course, faculty] = await Promise.all([Course.findById(req.body.course), User.findById(req.body.faculty)]);
  if (!course || !faculty || faculty.role !== 'faculty') return res.status(400).json({ success: false, error: { message: 'A valid course and faculty account are required' } });
  // Do not accept the internal enrolledCount capacity counter from client input.
  const section = await Section.create({
    course: course._id,
    faculty: faculty._id,
    name: req.body.name,
    term: req.body.term,
    ...(req.body.capacity !== undefined ? { capacity: req.body.capacity } : {})
  });
  res.status(201).json({ success: true, data: section });
});

exports.updateSection = asyncHandler(async (req, res) => {
  if (req.body.course) {
    const course = await Course.findById(req.body.course);
    if (!course) return res.status(400).json({ success: false, error: { message: 'Course not found' } });
  }
  if (req.body.faculty) {
    const faculty = await User.findById(req.body.faculty);
    if (!faculty || faculty.role !== 'faculty') return res.status(400).json({ success: false, error: { message: 'A valid faculty account is required' } });
  }
  const updates = {};
  for (const key of ['course', 'name', 'faculty', 'term', 'capacity', 'active']) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  // The capacity condition and update are evaluated atomically by MongoDB.
  const filter = { _id: req.params.id };
  if (req.body.capacity !== undefined) filter.$expr = { $lte: ['$enrolledCount', Number(req.body.capacity)] };
  const item = await Section.findOneAndUpdate(filter, updates, { new: true, runValidators: true });
  if (!item) {
    const exists = await Section.exists({ _id: req.params.id });
    if (exists && req.body.capacity !== undefined) {
      return res.status(409).json({ success: false, error: { message: 'Capacity cannot be lower than the active enrollment count' } });
    }
    return res.status(404).json({ success: false, error: { message: 'Resource not found' } });
  }
  res.json({ success: true, data: item });
});

exports.markAttendance = asyncHandler(async (req, res) => {
  const { section, sessionDate, records } = req.body;
  const sectionRecord = await Section.findById(section);
  if (!sectionRecord || !sectionRecord.active) return res.status(404).json({ success: false, error: { message: 'Active section not found' } });
  if (req.user.role === 'faculty' && String(sectionRecord.faculty) !== req.user.id) {
    return res.status(403).json({ success: false, error: { message: 'Section is not assigned to you' } });
  }

  const studentIds = records.map((record) => String(record.student));
  if (new Set(studentIds).size !== studentIds.length) {
    return res.status(400).json({ success: false, error: { message: 'A student may appear only once in an attendance request' } });
  }
  const enrolled = await Enrollment.find({ section, status: 'enrolled', student: { $in: studentIds } }).select('student');
  const enrolledIds = new Set(enrolled.map((item) => String(item.student)));
  if (studentIds.some((id) => !enrolledIds.has(id))) {
    return res.status(400).json({ success: false, error: { message: 'Every student must be actively enrolled in this section' } });
  }

  const date = new Date(sessionDate);
  date.setUTCHours(0, 0, 0, 0);
  const existingCount = await Attendance.countDocuments({ section, sessionDate: date, student: { $in: studentIds } });
  if (existingCount) {
    return res.status(409).json({ success: false, error: { message: 'Attendance already exists for at least one student in this class session; use the correction endpoint instead' } });
  }

  const documents = records.map(({ student, status }) => ({ student, section, sessionDate: date, status, markedBy: req.user.id }));
  // Insert one by one so a duplicate race cannot leave a partially saved class roster.
  const insertedIds = [];
  try {
    for (const document of documents) {
      const saved = await Attendance.create(document);
      insertedIds.push(saved._id);
    }
  } catch (error) {
    if (insertedIds.length) await Attendance.deleteMany({ _id: { $in: insertedIds } });
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: { message: 'Attendance already exists for at least one student in this class session' } });
    }
    throw error;
  }
  events.emit('attendance:marked', { section: String(section), sessionDate: date.toISOString(), count: documents.length });
  res.status(201).json({ success: true, data: { saved: documents.length } });
});

exports.correctAttendance = asyncHandler(async (req, res) => {
  const item = await Attendance.findById(req.params.id).populate('section');
  if (!item) return res.status(404).json({ success: false, error: { message: 'Attendance record not found' } });
  if (req.user.role === 'faculty' && String(item.section.faculty) !== req.user.id) return res.status(403).json({ success: false, error: { message: 'Section is not assigned to you' } });
  item.status = req.body.status;
  item.markedBy = req.user.id;
  item.correctionNote = req.body.correctionNote;
  await item.save();
  events.emit('attendance:corrected', { recordId: item.id, section: String(item.section.id) });
  res.json({ success: true, data: item });
});

exports.attendanceSummary = asyncHandler(async (req, res) => {
  let studentId;
  let sectionIds = null;
  if (req.user.role === 'student') {
    studentId = req.user.id;
  } else {
    studentId = req.query.studentId;
    if (!studentId || !mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, error: { message: 'A valid studentId query parameter is required' } });
    }
    if (req.user.role === 'faculty') {
      sectionIds = await Section.find({ faculty: req.user.id }).distinct('_id');
      const enrollment = await Enrollment.findOne({ student: studentId, section: { $in: sectionIds }, status: 'enrolled' });
      if (!enrollment) return res.status(403).json({ success: false, error: { message: 'Student is not enrolled in one of your sections' } });
    }
  }

  const match = { student: new mongoose.Types.ObjectId(studentId) };
  if (sectionIds) match.section = { $in: sectionIds };
  const summary = await Attendance.aggregate([
    { $match: match },
    { $group: { _id: '$section', totalClasses: { $sum: 1 }, attended: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
    { $addFields: { percentage: { $multiply: [{ $divide: ['$attended', '$totalClasses'] }, 100] } } },
    { $lookup: { from: 'sections', localField: '_id', foreignField: '_id', as: 'section' } },
    { $unwind: '$section' },
    { $lookup: { from: 'courses', localField: 'section.course', foreignField: '_id', as: 'course' } },
    { $unwind: '$course' },
    { $project: { _id: 0, sectionId: '$section._id', section: '$section.name', courseCode: '$course.code', courseTitle: '$course.title', totalClasses: 1, attended: 1, percentage: { $round: ['$percentage', 2] } } }
  ]);
  res.json({ success: true, data: summary, meta: { threshold: Number(process.env.ATTENDANCE_THRESHOLD || 75) } });
});

exports.getAttendance = asyncHandler(async (req, res) => {
  const item = await Attendance.findById(req.params.id).populate('section').populate('student', 'name studentId');
  if (!item) return res.status(404).json({ success: false, error: { message: 'Attendance record not found' } });
  if (req.user.role === 'student' && String(item.student._id) !== req.user.id) {
    return res.status(403).json({ success: false, error: { message: 'You may only view your own attendance' } });
  }
  if (req.user.role === 'faculty' && String(item.section.faculty) !== req.user.id) {
    return res.status(403).json({ success: false, error: { message: 'Section is not assigned to you' } });
  }
  res.json({ success: true, data: item });
});

exports.deleteAttendance = asyncHandler(async (req, res) => {
  const item = await Attendance.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: { message: 'Attendance record not found' } });
  res.json({ success: true, data: { id: item.id, deleted: true } });
});

exports.lowAttendance = asyncHandler(async (req, res) => {
  const configuredThreshold = Number(process.env.ATTENDANCE_THRESHOLD || 75);
  const requestedThreshold = req.query.threshold === undefined ? configuredThreshold : Number(req.query.threshold);
  const threshold = Number.isFinite(requestedThreshold)
    ? Math.max(0, Math.min(100, requestedThreshold))
    : configuredThreshold;
  const facultySections = req.user.role === 'faculty' ? await Section.find({ faculty: req.user.id }).distinct('_id') : null;
  const report = await Attendance.aggregate([
    ...(facultySections ? [{ $match: { section: { $in: facultySections } } }] : []),
    { $group: { _id: { student: '$student', section: '$section' }, totalClasses: { $sum: 1 }, attended: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
    { $addFields: { percentage: { $multiply: [{ $divide: ['$attended', '$totalClasses'] }, 100] } } },
    { $match: { percentage: { $lt: threshold } } },
    { $lookup: { from: 'users', localField: '_id.student', foreignField: '_id', as: 'student' } }, { $unwind: '$student' },
    { $lookup: { from: 'sections', localField: '_id.section', foreignField: '_id', as: 'section' } }, { $unwind: '$section' },
    { $lookup: { from: 'courses', localField: 'section.course', foreignField: '_id', as: 'course' } }, { $unwind: '$course' },
    { $project: { studentId: '$student._id', name: '$student.name', email: '$student.email', section: '$section.name', course: '$course.code', totalClasses: 1, attended: 1, percentage: { $round: ['$percentage', 2] } } },
    { $sort: { percentage: 1 } }
  ]);
  res.json({ success: true, data: report, meta: { threshold } });
});

exports.courseEnrollmentReport = asyncHandler(async (req, res) => {
  const facultySections = req.user.role === 'faculty' ? await Section.find({ faculty: req.user.id }).distinct('_id') : null;
  const report = await Enrollment.aggregate([
    { $match: { status: 'enrolled' } },
    { $lookup: { from: 'sections', localField: 'section', foreignField: '_id', as: 'section' } }, { $unwind: '$section' },
    ...(facultySections ? [{ $match: { 'section._id': { $in: facultySections } } }] : []),
    { $lookup: { from: 'courses', localField: 'section.course', foreignField: '_id', as: 'course' } }, { $unwind: '$course' },
    { $group: { _id: { course: '$course._id', section: '$section._id' }, courseCode: { $first: '$course.code' }, courseTitle: { $first: '$course.title' }, section: { $first: '$section.name' }, term: { $first: '$section.term' }, enrollmentCount: { $sum: 1 }, capacity: { $first: '$section.capacity' } } },
    { $sort: { courseCode: 1, section: 1 } }
  ]);
  res.json({ success: true, data: report });
});

exports.createAnnouncement = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user.id };
  if (payload.audience === 'section' && !payload.section) return res.status(400).json({ success: false, error: { message: 'section is required for section announcements' } });
  if (payload.audience === 'course' && !payload.course && !payload.section) return res.status(400).json({ success: false, error: { message: 'course or section is required for course announcements' } });
  if (req.user.role === 'faculty') {
    if (payload.audience === 'university') return res.status(403).json({ success: false, error: { message: 'Faculty cannot publish university-wide announcements' } });
    if (payload.section) {
      const section = await Section.findById(payload.section);
      if (!section || String(section.faculty) !== req.user.id) return res.status(403).json({ success: false, error: { message: 'Section is not assigned to you' } });
      if (payload.course && String(section.course) !== String(payload.course)) return res.status(400).json({ success: false, error: { message: 'Course does not match section' } });
      if (payload.audience === 'course') payload.course = section.course;
    } else if (payload.course) {
      const assigned = await Section.exists({ course: payload.course, faculty: req.user.id });
      if (!assigned) return res.status(403).json({ success: false, error: { message: 'Course is not assigned to you' } });
    }
  }
  if (payload.section && !(await Section.exists({ _id: payload.section }))) return res.status(400).json({ success: false, error: { message: 'Section not found' } });
  if (payload.course && !(await Course.exists({ _id: payload.course }))) return res.status(400).json({ success: false, error: { message: 'Course not found' } });
  const announcement = await Announcement.create(payload);
  events.emit('announcement:created', announcement.toObject());
  res.status(201).json({ success: true, data: announcement });
});

exports.listAnnouncements = asyncHandler(async (req, res) => {
  let sectionIds = [];
  if (req.user.role === 'student') sectionIds = await Enrollment.find({ student: req.user.id, status: 'enrolled' }).distinct('section');
  const courseIds = req.user.role === 'student' ? await Section.find({ _id: { $in: sectionIds } }).distinct('course') : [];
  const filter = req.user.role === 'student'
    ? { $or: [{ audience: 'university' }, { audience: 'section', section: { $in: sectionIds } }, { audience: 'course', course: { $in: courseIds } }] }
    : {};
  const items = await Announcement.find(filter).populate('createdBy', 'name role').sort({ publishedAt: -1 }).limit(100);
  res.json({ success: true, data: items });
});

exports.facultySectionGuard = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'faculty') return next();
  const sectionId = req.params.sectionId || req.query.section || req.body.section;
  if (!sectionId) return res.status(400).json({ success: false, error: { message: 'Section is required' } });
  const section = await Section.findOne({ _id: sectionId, faculty: req.user.id });
  if (!section) return res.status(403).json({ success: false, error: { message: 'Section is not assigned to you' } });
  next();
});

exports.listEnrollments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'student') filter.student = req.user.id;
  if (req.user.role === 'faculty') filter.section = { $in: await Section.find({ faculty: req.user.id }).distinct('_id') };
  if (req.user.role !== 'student' && req.query.student) filter.student = req.query.student;
  if (req.query.section) {
    if (req.user.role === 'faculty' && !filter.section.$in.some((id) => String(id) === req.query.section)) {
      return res.status(403).json({ success: false, error: { message: 'Section is not assigned to you' } });
    }
    filter.section = req.query.section;
  }
  if (req.query.status && ['enrolled', 'dropped'].includes(req.query.status)) filter.status = req.query.status;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const [items, total] = await Promise.all([
    Enrollment.find(filter).populate('student', 'name studentId email').populate('section', 'name term course').sort({ enrolledAt: -1 }).skip((page - 1) * limit).limit(limit),
    Enrollment.countDocuments(filter)
  ]);
  res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.getEnrollment = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role === 'student') filter.student = req.user.id;
  if (req.user.role === 'faculty') filter.section = { $in: await Section.find({ faculty: req.user.id }).distinct('_id') };
  const item = await Enrollment.findOne(filter).populate('student', 'name studentId email').populate('section', 'name term course');
  if (!item) return res.status(404).json({ success: false, error: { message: 'Enrollment not found' } });
  res.json({ success: true, data: item });
});

exports.updateEnrollment = asyncHandler(async (req, res) => {
  const item = await Enrollment.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: { message: 'Enrollment not found' } });
  const nextStatus = req.body.status;
  if (nextStatus === item.status) return res.json({ success: true, data: item });
  if (nextStatus === 'dropped') {
    const updated = await Enrollment.findOneAndUpdate({ _id: item._id, status: 'enrolled' }, { $set: { status: 'dropped' } }, { new: true });
    if (!updated) return res.status(409).json({ success: false, error: { message: 'Enrollment changed; please retry' } });
    await Section.updateOne({ _id: item.section, enrolledCount: { $gt: 0 } }, { $inc: { enrolledCount: -1 } });
    return res.json({ success: true, data: updated });
  }
  const reserved = await Section.findOneAndUpdate(
    { _id: item.section, active: true, $expr: { $lt: ['$enrolledCount', '$capacity'] } },
    { $inc: { enrolledCount: 1 } },
    { new: true }
  );
  if (!reserved) return res.status(409).json({ success: false, error: { message: 'Section is full or inactive' } });
  const updated = await Enrollment.findOneAndUpdate({ _id: item._id, status: 'dropped' }, { $set: { status: 'enrolled', enrolledAt: new Date() } }, { new: true });
  if (!updated) {
    await Section.updateOne({ _id: item.section, enrolledCount: { $gt: 0 } }, { $inc: { enrolledCount: -1 } });
    return res.status(409).json({ success: false, error: { message: 'Enrollment changed; please retry' } });
  }
  res.json({ success: true, data: updated });
});

exports.removeEnrollment = asyncHandler(async (req, res) => {
  const item = await Enrollment.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: { message: 'Enrollment not found' } });
  if (item.status === 'enrolled') await Section.updateOne({ _id: item.section, enrolledCount: { $gt: 0 } }, { $inc: { enrolledCount: -1 } });
  res.json({ success: true, data: { id: item.id, deleted: true } });
});
