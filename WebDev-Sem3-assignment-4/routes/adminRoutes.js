const express = require("express");
const router = express.Router();
const { getAllUsers, getAllNotes } = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/rbacMiddleware");

router.use(authMiddleware);
router.use(authorize("admin"));

router.get("/users", getAllUsers);
router.get("/notes", getAllNotes);

module.exports = router;
