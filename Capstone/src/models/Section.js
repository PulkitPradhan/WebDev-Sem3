const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 40 },
  term: { type: String, required: true, trim: true },
  capacity: { type: Number, min: 1, max: 500, default: 60 },
  enrolledCount: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });
sectionSchema.index({ course: 1, name: 1, term: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);
