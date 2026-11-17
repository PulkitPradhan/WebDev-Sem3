const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
  status: { type: String, enum: ['enrolled', 'dropped'], default: 'enrolled' },
  enrolledAt: { type: Date, default: Date.now }
}, { timestamps: true });
enrollmentSchema.index({ student: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
