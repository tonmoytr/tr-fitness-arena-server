const express = require("express");
const router = express.Router();
const {
  getPendingApplications,
  authorizeTrainerApplication,
  getAdminDashboardStats,
  getAllSystemUsers,
  updateUserRole,
} = require("../controllers/adminController");

router.get("/applications", getPendingApplications);
router.patch("/applications/:id", authorizeTrainerApplication);

router.get("/dashboard-stats", getAdminDashboardStats);

router.get("/users", getAllSystemUsers);
router.patch("/users/:id/role", updateUserRole);

module.exports = router;
