const Product = require('../models/Product');

const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

const getAllProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.category) {
      filter.category = { $regex: req.query.category.trim(), $options: 'i' };
    }

    if (req.query.supplier) {
      filter.supplier = { $regex: req.query.supplier.trim(), $options: 'i' };
    }

    if (req.query.name) {
      filter.name = { $regex: req.query.name.trim(), $options: 'i' };
    }

    if (req.query.sku) {
      filter.sku = { $regex: req.query.sku.trim(), $options: 'i' };
    }

    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      filter.price = {};
      if (req.query.minPrice !== undefined && req.query.minPrice !== '') {
        filter.price.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
        filter.price.$lte = Number(req.query.maxPrice);
      }
    }

    if (req.query.minQuantity !== undefined || req.query.maxQuantity !== undefined) {
      filter.quantity = {};
      if (req.query.minQuantity !== undefined && req.query.minQuantity !== '') {
        filter.quantity.$gte = Number(req.query.minQuantity);
      }
      if (req.query.maxQuantity !== undefined && req.query.maxQuantity !== '') {
        filter.quantity.$lte = Number(req.query.maxQuantity);
      }
    }

    if (req.query.search) {
      const searchRegex = { $regex: req.query.search.trim(), $options: 'i' };
      filter.$or = [{ name: searchRegex }, { sku: searchRegex }, { category: searchRegex }];
    }

    let sort = {};
    if (req.query.sort) {
      if (req.query.sort.startsWith('-')) {
        sort[req.query.sort.substring(1)] = -1;
      } else {
        const parts = req.query.sort.split(':');
        sort[parts[0]] = parts[1] === 'desc' || parts[1] === '-1' ? -1 : 1;
      }
    } else if (req.query.sortBy) {
      const order = req.query.order === 'asc' || req.query.sortOrder === 'asc' ? 1 : -1;
      sort[req.query.sortBy] = order;
    } else {
      sort = { createdAt: -1 };
    }

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      total,
      page,
      totalPages,
      count: products.length,
      products
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Request body cannot be empty' });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({
      message: 'Product deleted',
      id: product._id
    });
  } catch (error) {
    next(error);
  }
};

const adjustProductStock = async (req, res, next) => {
  try {
    const { change } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.quantity + change < 0) {
      return res.status(400).json({
        message: `Insufficient stock. Current quantity is ${product.quantity}`
      });
    }

    product.quantity += change;
    await product.save();

    res.status(200).json({
      message: 'Stock updated',
      product
    });
  } catch (error) {
    next(error);
  }
};

const getLowStockProducts = async (req, res, next) => {
  try {
    const lowStockItems = await Product.aggregate([
      {
        $match: {
          $expr: { $lte: ['$quantity', '$reorderLevel'] }
        }
      },
      {
        $addFields: {
          stockValue: { $multiply: ['$price', '$quantity'] },
          id: { $toString: '$_id' }
        }
      },
      {
        $sort: { quantity: 1 }
      }
    ]);

    res.status(200).json({
      count: lowStockItems.length,
      lowStockItems
    });
  } catch (error) {
    next(error);
  }
};

const getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $sort: { totalStockValue: -1 }
      }
    ]);

    res.status(200).json({
      categories: summary.length,
      summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustProductStock,
  getLowStockProducts,
  getCategorySummary
};
