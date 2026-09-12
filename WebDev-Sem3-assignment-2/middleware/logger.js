// Custom Logger Middleware to log incoming HTTP method and request URL
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};

module.exports = logger;