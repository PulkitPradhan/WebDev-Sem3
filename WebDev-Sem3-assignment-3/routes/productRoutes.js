const express = require('express');
const router = express.Router();

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustProductStock,
  getLowStockProducts,
  getCategorySummary
} = require('../controllers/productController');

const {
  validateProductId,
  validateCreateProduct,
  validateStockAdjustment
} = require('../middleware/validate');

router.get('/low-stock', getLowStockProducts);
router.get('/summary', getCategorySummary);
router.get('/', getAllProducts);
router.post('/', validateCreateProduct, createProduct);
router.get('/:id', validateProductId, getProductById);
router.put('/:id', validateProductId, updateProduct);
router.patch('/:id/stock', validateProductId, validateStockAdjustment, adjustProductStock);
router.delete('/:id', validateProductId, deleteProduct);

module.exports = router;
