const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { signAccessToken, signRefreshToken } = require('../utils/tokens');

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const safeUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, studentId: user.studentId, department: user.department });

async function issueTokens(user, res) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const decoded = jwt.decode(refreshToken);
  user.refreshTokenHash = hash(refreshToken);
  user.refreshTokenExpiresAt = new Date(decoded.exp * 1000);
  await user.save();
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict',
    maxAge: Number(process.env.REFRESH_TOKEN_DAYS || 7) * 86400000, path: '/api/auth'
  });
  return accessToken;
}

exports.register = async (req, res) => {
  const { name, email, password, studentId, department } = req.body;
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), studentId, department, role: 'student' });
  const accessToken = await issueTokens(user, res);
  res.status(201).json({ success: true, data: { user: safeUser(user), accessToken } });
};

exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash +authVersion');
  if (!user || !user.active || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    return res.status(401).json({ success: false, error: { message: 'Invalid email or password' } });
  }
  const accessToken = await issueTokens(user, res);
  res.json({ success: true, data: { user: safeUser(user), accessToken } });
};

exports.refresh = async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (!token) return res.status(401).json({ success: false, error: { message: 'Refresh token required' } });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
  catch { return res.status(401).json({ success: false, error: { message: 'Invalid or expired refresh token' } }); }
  const user = await User.findById(payload.sub).select('+refreshTokenHash +refreshTokenExpiresAt +authVersion');
  if (!user || !user.active || !user.refreshTokenHash || user.refreshTokenHash !== hash(token) || user.refreshTokenExpiresAt < new Date()) {
    return res.status(401).json({ success: false, error: { message: 'Refresh token has been revoked' } });
  }
  const accessToken = await issueTokens(user, res);
  res.json({ success: true, data: { user: safeUser(user), accessToken } });
};

exports.logout = async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (token) {
    try {
      const { sub } = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(sub, { $inc: { authVersion: 1 }, $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 } });
    } catch { /* Logout remains idempotent for expired tokens. */ }
  }
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', path: '/api/auth' });
  res.json({ success: true, data: { message: 'Logged out' } });
};

exports.me = async (req, res) => res.json({ success: true, data: { user: safeUser(req.user) } });
