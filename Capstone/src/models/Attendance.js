const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
  sessionDate: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  correctionNote: { type: String, maxlength: 500 }
}, { timestamps: true });
attendanceSchema.index({ student: 1, section: 1, sessionDate: 1 }, { unique: true });
attendanceSchema.index({ section: 1, sessionDate: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
