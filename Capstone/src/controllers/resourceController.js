const asyncHandler = require('../utils/asyncHandler');
const { matchedData } = require('express-validator');

exports.list = (Model, populate = '') => asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const filter = {};
  for (const key of ['active', 'department', 'role', 'course', 'faculty', 'section', 'student', 'status', 'audience', 'term']) {
    if (req.query[key] !== undefined && Model.schema.path(key)) filter[key] = req.query[key];
  }
  if (req.query.search && Model.schema.path('name')) filter.name = { $regex: req.query.search, $options: 'i' };
  const [items, total] = await Promise.all([
    Model.find(filter).populate(populate).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Model.countDocuments(filter)
  ]);
  res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.get = (Model, populate = '') => asyncHandler(async (req, res) => {
  const item = await Model.findById(req.params.id).populate(populate);
  if (!item) return res.status(404).json({ success: false, error: { message: 'Resource not found' } });
  res.json({ success: true, data: item });
});

exports.create = (Model) => asyncHandler(async (req, res) => {
  const item = await Model.create(matchedData(req, { locations: ['body'] }));
  res.status(201).json({ success: true, data: item });
});

exports.update = (Model) => asyncHandler(async (req, res) => {
  const item = await Model.findByIdAndUpdate(req.params.id, matchedData(req, { locations: ['body'] }), { new: true, runValidators: true });
  if (!item) return res.status(404).json({ success: false, error: { message: 'Resource not found' } });
  res.json({ success: true, data: item });
});

exports.remove = (Model) => asyncHandler(async (req, res) => {
  const item = await Model.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: { message: 'Resource not found' } });
  res.json({ success: true, data: { id: item.id, deleted: true } });
});
