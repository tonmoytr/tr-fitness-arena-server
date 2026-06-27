const express = require("express");
const router = express.Router();
const {
  getPendingApplications,
  authorizeTrainerApplication,
} = require("../controllers/adminController");

router.get("/applications", getPendingApplications);
router.patch("/applications/:id", authorizeTrainerApplication);

module.exports = router;
