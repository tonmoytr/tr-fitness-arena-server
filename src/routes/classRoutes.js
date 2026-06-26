const express = require("express");
const {
  getAllClasses,
  getClassById,
  checkClassStatus,
  handleAddFavorite,
  getUserFavorites,
  handleDeleteFavorite,
} = require("../controllers/classController");
const router = express.Router();

// When someone hits the base URL of this router, trigger our controller logic
router.get("/", getAllClasses);

router.post("/favorites", handleAddFavorite);
router.get("/:id/status", checkClassStatus);

// Your single data details route MUST stay below it:
router.get("/:id", getClassById);

router.get("/favorites/user", getUserFavorites);
router.delete("/favorites/:id", handleDeleteFavorite);

module.exports = router;
