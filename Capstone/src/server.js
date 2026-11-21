require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('./app');
const connectDatabase = require('./config/db');
const User = require('./models/User');
const Section = require('./models/Section');
const Enrollment = require('./models/Enrollment');
const events = require('./utils/appEvents');
const { rebuildEnrollmentCounts } = require('./utils/enrollmentCounters');

async function start() {
  await connectDatabase();
  await rebuildEnrollmentCounts();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true } });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(payload.sub).select('_id role active +authVersion');
      if (!user || !user.active || (payload.ver || 0) !== user.authVersion) return next(new Error('Account unavailable or token revoked'));
      socket.user = { id: String(user._id), role: user.role };
      next();
    } catch { next(new Error('Invalid or expired access token')); }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);
    if (socket.user.role === 'student') {
      const sections = await Enrollment.find({ student: userId, status: 'enrolled' }).distinct('section');
      sections.forEach((id) => socket.join(`section:${id}`));
      const courses = await Section.find({ _id: { $in: sections } }).distinct('course');
      courses.forEach((id) => socket.join(`course:${id}`));
    } else if (socket.user.role === 'faculty') {
      const sections = await Section.find({ faculty: userId }).distinct('_id');
      sections.forEach((id) => socket.join(`section:${id}`));
      const courses = await Section.find({ faculty: userId }).distinct('course');
      courses.forEach((id) => socket.join(`course:${id}`));
    }
    socket.on('disconnect', () => {});
  });

  events.on('announcement:created', (announcement) => {
    const message = { id: String(announcement._id), title: announcement.title, body: announcement.body, audience: announcement.audience, publishedAt: announcement.publishedAt };
    if (announcement.audience === 'university') io.emit('announcement:new', message);
    else if (announcement.section) io.to(`section:${announcement.section}`).emit('announcement:new', message);
    else if (announcement.course) io.to(`course:${announcement.course}`).emit('announcement:new', message);
  });
  events.on('attendance:marked', (payload) => io.to(`section:${payload.section}`).emit('attendance:updated', payload));
  events.on('attendance:corrected', (payload) => io.to(`section:${payload.section}`).emit('attendance:updated', payload));

  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => console.log(`Campus Management API listening on port ${port}`));
  const shutdown = async () => { server.close(); await mongoose.disconnect(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => { console.error('Server startup failed:', error); process.exit(1); });
