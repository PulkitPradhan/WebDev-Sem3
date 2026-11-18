'use strict';
const Section = require('../models/Section');
const Enrollment = require('../models/Enrollment');

async function rebuildEnrollmentCounts() {
  await Section.updateMany({}, { $set: { enrolledCount: 0 } });
  const counts = await Enrollment.aggregate([
    { $match: { status: 'enrolled' } },
    { $group: { _id: '$section', count: { $sum: 1 } } }
  ]);
  if (counts.length) {
    await Section.bulkWrite(counts.map((item) => ({
      updateOne: { filter: { _id: item._id }, update: { $set: { enrolledCount: item.count } } }
    })));
  }
  return counts.length;
}
module.exports = { rebuildEnrollmentCounts };
