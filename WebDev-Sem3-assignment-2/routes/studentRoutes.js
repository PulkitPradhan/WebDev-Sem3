const express = require("express");
const router = express.Router();

const students = require("../data/students");

// GET /students - Fetch all student records
router.get("/", (req, res) => {
  res.status(200).json(students);
});

// GET /students/:id - Fetch student by ID
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  res.status(200).json(student);
});

// POST /students - Add a new student
router.post("/", (req, res) => {
  const { name, age, course } = req.body;

  if (!name || !age || !course) {
    return res.status(400).json({
      message: "Name, age and course are required",
    });
  }

  const newStudent = {
    id: students.length > 0 ? students[students.length - 1].id + 1 : 1,
    name: name,
    age: age,
    course: course,
  };

  students.push(newStudent);

  res.status(201).json({
    message: "Student added successfully",
    student: newStudent,
  });
});

// PUT /students/:id - Update existing student details
router.put("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  const { name, age, course } = req.body;

  if (!name || !age || !course) {
    return res.status(400).json({
      message: "Name, age and course are required",
    });
  }

  student.name = name;
  student.age = age;
  student.course = course;

  res.status(200).json({
    message: "Student updated successfully",
    student: student,
  });
});

// DELETE /students/:id - Delete a student record
router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = students.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  const deletedStudent = students.splice(index, 1);

  res.status(200).json({
    message: "Student deleted successfully",
    student: deletedStudent[0],
  });
});

module.exports = router;