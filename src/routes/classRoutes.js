const express = require("express");
const { getAllClasses } = require("../controllers/classController");
const router = express.Router();

// When someone hits the base URL of this router, trigger our controller logic
router.get("/", getAllClasses);

module.exports = router;
