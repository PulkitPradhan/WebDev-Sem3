const mongoose = require('mongoose');

const validateProductId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid product ID format' });
  }
  next();
};

const validateCreateProduct = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: 'Request body cannot be empty' });
  }

  const { name, sku, category, price, quantity, reorderLevel, supplier } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('name is required');
  }
  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    errors.push('sku is required');
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    errors.push('category is required');
  }
  if (price === undefined || typeof price !== 'number' || price < 0) {
    errors.push('price must be a non-negative number');
  }
  if (quantity === undefined || typeof quantity !== 'number' || quantity < 0) {
    errors.push('quantity must be a non-negative number');
  }
  if (reorderLevel === undefined || typeof reorderLevel !== 'number' || reorderLevel < 0) {
    errors.push('reorderLevel must be a non-negative number');
  }
  if (!supplier || typeof supplier !== 'string' || !supplier.trim()) {
    errors.push('supplier is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation failed',
      errors
    });
  }

  next();
};

const validateStockAdjustment = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: 'Request body cannot be empty' });
  }

  const { change } = req.body;
  if (change === undefined || typeof change !== 'number' || Number.isNaN(change)) {
    return res.status(400).json({ message: 'A valid numeric change value is required' });
  }
  next();
};

module.exports = {
  validateProductId,
  validateCreateProduct,
  validateStockAdjustment
};
