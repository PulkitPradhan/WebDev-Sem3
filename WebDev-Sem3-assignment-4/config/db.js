const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[database] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[database] Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
