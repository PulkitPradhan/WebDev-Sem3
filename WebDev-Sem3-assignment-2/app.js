const express = require("express");
const logger = require("./middleware/logger");
const studentRoutes = require("./routes/studentRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(logger);

// Modular Routes
app.use("/students", studentRoutes);

// Health check / welcome route
app.get("/", (req, res) => {
  res.send("Student Management API is running");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});