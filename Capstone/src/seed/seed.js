require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDatabase = require('../config/db');
const User = require('../models/User');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');
const Announcement = require('../models/Announcement');
const { rebuildEnrollmentCounts } = require('../utils/enrollmentCounters');

async function run() {
  await connectDatabase();
  const passwordHash = await bcrypt.hash('CampusDemo123!', 12);
  const upsertUser = (email, data) => User.findOneAndUpdate({ email }, { $set: { ...data, email, passwordHash } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  const [admin, faculty, studentA, studentB] = await Promise.all([
    upsertUser('admin@campus.test', { name: 'Asha Administrator', role: 'admin', department: 'Administration' }),
    upsertUser('faculty@campus.test', { name: 'Dr. Rohan Mehta', role: 'faculty', department: 'Computer Science' }),
    upsertUser('student1@campus.test', { name: 'Mira Shah', role: 'student', studentId: 'STU-1001', department: 'Computer Science' }),
    upsertUser('student2@campus.test', { name: 'Kabir Rao', role: 'student', studentId: 'STU-1002', department: 'Computer Science' })
  ]);
  const course = await Course.findOneAndUpdate({ code: 'CS101' }, { $set: { code: 'CS101', title: 'Backend Development', description: 'REST APIs, databases, authentication and real-time services.', credits: 4, department: 'Computer Science' } }, { new: true, upsert: true });
  const section = await Section.findOneAndUpdate({ course: course.id, name: 'A', term: 'Fall 2026' }, { $set: { course: course.id, faculty: faculty.id, name: 'A', term: 'Fall 2026', capacity: 60 } }, { new: true, upsert: true });
  for (const student of [studentA, studentB]) await Enrollment.updateOne({ student: student.id, section: section.id }, { $setOnInsert: { student: student.id, section: section.id, status: 'enrolled' } }, { upsert: true });
  const activeStudents = [studentA, studentB];
  for (let day = 1; day <= 8; day++) {
    const sessionDate = new Date(Date.UTC(2026, 9, day));
    for (const [index, student] of activeStudents.entries()) {
      await Attendance.updateOne({ student: student.id, section: section.id, sessionDate }, { $set: { status: (day + index) % 4 === 0 ? 'absent' : 'present', markedBy: faculty.id }, $setOnInsert: { student: student.id, section: section.id, sessionDate } }, { upsert: true });
    }
  }
  await Announcement.updateOne({ title: 'Welcome to Backend Development', audience: 'section', section: section.id }, { $set: { title: 'Welcome to Backend Development', body: 'Review the course API documentation and bring questions to the next class.', audience: 'section', section: section.id, course: course.id, createdBy: faculty.id } }, { upsert: true });
  await rebuildEnrollmentCounts();
  console.log('Seed complete. Demo password for all four accounts: CampusDemo123!');
  console.log('Accounts: admin@campus.test, faculty@campus.test, student1@campus.test, student2@campus.test');
  process.exit(0);
}

run().catch((error) => { console.error(error); process.exit(1); });
