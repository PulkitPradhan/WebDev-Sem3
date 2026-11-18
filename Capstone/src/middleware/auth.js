const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET); }
  catch { return res.status(401).json({ success: false, error: { message: 'Invalid or expired access token' } }); }
  const user = await User.findById(payload.sub).select('+authVersion -passwordHash -refreshTokenHash');
  if (!user || !user.active || (payload.ver || 0) !== user.authVersion) return res.status(401).json({ success: false, error: { message: 'Account is unavailable or token has been revoked' } });
  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: { message: 'Insufficient role permissions' } });
  }
  next();
};

module.exports = { protect, authorize };
