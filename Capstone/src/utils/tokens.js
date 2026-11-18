const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, ver: user.authVersion || 0 }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || '15m'
  });
}

function signRefreshToken(user) {
  const days = Number(process.env.REFRESH_TOKEN_DAYS || 7);
  return jwt.sign({ sub: user.id, tokenId: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: `${days}d`
  });
}

module.exports = { signAccessToken, signRefreshToken };
