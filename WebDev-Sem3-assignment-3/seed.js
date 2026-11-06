require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const seedProducts = [
  {
    name: 'Study Table',
    sku: 'FURN-TB-012',
    category: 'Furniture',
    price: 3999,
    quantity: 2,
    reorderLevel: 4,
    supplier: 'IKEA India'
  },
  {
    name: 'Ergonomic Desk Chair',
    sku: 'FURN-CH-045',
    category: 'Furniture',
    price: 5499,
    quantity: 3,
    reorderLevel: 5,
    supplier: 'Godrej Interio'
  },
  {
    name: 'Classic Ballpoint Pens (Pack of 10)',
    sku: 'STNY-BP-101',
    category: 'Stationery',
    price: 120,
    quantity: 40,
    reorderLevel: 20,
    supplier: 'Reynolds'
  },
  {
    name: 'Spiral Bound Notebook A5',
    sku: 'STNY-NB-102',
    category: 'Stationery',
    price: 95,
    quantity: 12,
    reorderLevel: 15,
    supplier: 'Classmate'
  },
  {
    name: 'Wireless Optical Mouse',
    sku: 'ELEC-MS-101',
    category: 'Electronics',
    price: 800,
    quantity: 35,
    reorderLevel: 15,
    supplier: 'Logitech India'
  },
  {
    name: 'Mechanical Gaming Keyboard',
    sku: 'ELEC-KB-204',
    category: 'Electronics',
    price: 2000,
    quantity: 26,
    reorderLevel: 10,
    supplier: 'Redragon'
  },
  {
    name: 'Active Noise Canceling Headphones',
    sku: 'ELEC-HP-305',
    category: 'Electronics',
    price: 5070,
    quantity: 26,
    reorderLevel: 10,
    supplier: 'Boat Lifestyle'
  },
  {
    name: 'Ultra HD 27-inch Monitor',
    sku: 'ELEC-MN-408',
    category: 'Electronics',
    price: 14676,
    quantity: 9,
    reorderLevel: 5,
    supplier: 'Samsung'
  },
  {
    name: 'Cotton Casual T-Shirt',
    sku: 'APPR-TS-501',
    category: 'Apparel',
    price: 799,
    quantity: 67,
    reorderLevel: 20,
    supplier: 'Zudio'
  },
  {
    name: 'Slim Fit Denim Jeans',
    sku: 'APPR-JN-602',
    category: 'Apparel',
    price: 1999,
    quantity: 11,
    reorderLevel: 5,
    supplier: 'Levis'
  },
  {
    name: 'Stainless Steel Water Bottle',
    sku: 'KTCH-BT-701',
    category: 'Kitchenware',
    price: 499,
    quantity: 18,
    reorderLevel: 10,
    supplier: 'Milton'
  },
  {
    name: 'Ceramic Dinner Plate Set',
    sku: 'KTCH-PL-802',
    category: 'Kitchenware',
    price: 1299,
    quantity: 4,
    reorderLevel: 6,
    supplier: 'Clay Craft'
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory_db');
    await Product.deleteMany({});
    await Product.insertMany(seedProducts);
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error(`Seeding error: ${error.message}`);
    process.exit(1);
  }
};

seedDB();
