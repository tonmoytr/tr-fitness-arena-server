const express = require("express");
const router = express.Router();
const {
  handleTrainerApplication,
  getApplicationStatus,
  handleCreateClass,
} = require("../controllers/trainerController");

router.get("/status", getApplicationStatus);
router.post("/apply", handleTrainerApplication);

router.post("/classes", handleCreateClass);

module.exports = router;
