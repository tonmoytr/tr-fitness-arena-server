const express = require("express");
const router = express.Router();
const {
  handleTrainerApplication,
  getApplicationStatus,
  handleCreateClass,
  getUserDashboardMetrics,
  getTrainerDashboardMetrics,
  devForceUpdateRole,
  getClassesByTrainer,
  deleteClassById,
  updateClassById,
  createForumPost,
  getForumPostsByTrainer,
  deleteForumPostById,
  resetRejectedApplication,
  createTrainerClass,
} = require("../controllers/trainerController");

router.get("/status", getApplicationStatus);
router.post("/apply", handleTrainerApplication);

router.post("/classes", handleCreateClass);
router.get("/dashboard/member-stats", getUserDashboardMetrics);

router.get("/dashboard/trainer-stats", getTrainerDashboardMetrics);

router.get("/my-classes", getClassesByTrainer);
router.delete("/classes/:id", deleteClassById);

router.put("/classes/:id", updateClassById);

router.post("/forums", createForumPost);

router.get("/my-forums", getForumPostsByTrainer);
router.delete("/forums/:id", deleteForumPostById);

router.delete("/applications/reset", resetRejectedApplication);

router.post("/classes", createTrainerClass);

module.exports = router;
