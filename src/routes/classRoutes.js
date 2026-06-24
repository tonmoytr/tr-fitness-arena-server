const express = require("express");
const {
  getAllClasses,
  getClassById,
} = require("../controllers/classController");
const router = express.Router();

// When someone hits the base URL of this router, trigger our controller logic
router.get("/", getAllClasses);

router.get("/:id", getClassById);

module.exports = router;
