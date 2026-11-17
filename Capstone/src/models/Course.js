const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, maxlength: 2000 },
  credits: { type: Number, min: 1, max: 12, default: 3 },
  department: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
