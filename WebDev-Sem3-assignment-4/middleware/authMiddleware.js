const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey_lab4_secure_connect";

const authMiddleware = (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader) {
    token = String(authHeader).trim();
    while (/^Bearer\s+/i.test(token)) {
      token = token.replace(/^Bearer\s+/i, "").trim();
    }
  } else if (req.headers.token) {
    token = req.headers.token;
  } else if (req.headers["x-access-token"]) {
    token = req.headers["x-access-token"];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else if (req.body && req.body.token) {
    token = req.body.token;
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").reduce((acc, cookie) => {
      const [key, ...vals] = cookie.trim().split("=");
      acc[key] = vals.join("=");
      return acc;
    }, {});
    token = cookies.token || cookies.jwt;
  }

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  token = String(token).replace(/^["']|["']$/g, "").trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
