const Note = require("../models/Note");
const appEvents = require("../events/eventEmitter");

const createNote = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Please provide title and content" });
    }

    const note = await Note.create({
      title,
      content,
      owner: req.user.id
    });

    appEvents.emit("note:created", note);

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ owner: req.user.id }).sort({ createdAt: 1 });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.owner.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: not authorized to view this note" });
    }

    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.owner.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: not authorized to update this note" });
    }

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;

    const updatedNote = await note.save();
    appEvents.emit("note:updated", updatedNote);

    res.status(200).json(updatedNote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.owner.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: not authorized to delete this note" });
    }

    await note.deleteOne();
    appEvents.emit("note:deleted", req.params.id);

    res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote
};
