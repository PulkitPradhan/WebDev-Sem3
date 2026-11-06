const express = require("express");
const router = express.Router();
const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote
} = require("../controllers/noteController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.route("/")
  .post(createNote)
  .get(getNotes);

router.route("/:id")
  .get(getNoteById)
  .put(updateNote)
  .delete(deleteNote);

module.exports = router;
