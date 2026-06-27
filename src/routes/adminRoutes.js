const express = require("express");
const router = express.Router();
const {
  getPendingApplications,
  authorizeTrainerApplication,
  getAdminDashboardStats,
  getAllSystemUsers,
  updateUserRole,
  getAllSystemClasses,
  updateClassStatus,
  deleteSystemClass,
} = require("../controllers/adminController");

router.get("/applications", getPendingApplications);
router.patch("/applications/:id", authorizeTrainerApplication);

router.get("/dashboard-stats", getAdminDashboardStats);

router.get("/users", getAllSystemUsers);
router.patch("/users/:id/role", updateUserRole);

router.get("/classes", getAllSystemClasses);
router.patch("/classes/:id/status", updateClassStatus);
router.delete("/classes/:id", deleteSystemClass);

module.exports = router;
