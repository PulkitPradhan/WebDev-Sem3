const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'faculty', 'student'], default: 'student', index: true },
  studentId: { type: String, trim: true, sparse: true, unique: true },
  department: { type: String, trim: true },
  active: { type: Boolean, default: true },
  authVersion: { type: Number, default: 0, select: false },
  refreshTokenHash: { type: String, select: false },
  refreshTokenExpiresAt: { type: Date, select: false }
}, { timestamps: true, toJSON: { transform: (_, ret) => { delete ret.passwordHash; delete ret.refreshTokenHash; delete ret.refreshTokenExpiresAt; return ret; } } });

module.exports = mongoose.model('User', userSchema);
