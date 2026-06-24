const express = require("express");
const router = express.Router();
const {
  getLatestForumPosts,
  getForumPostById,
} = require("../controllers/forumController");

router.get("/", getLatestForumPosts);

// Dynamic ID path matches: GET /api/v1/forums/:id
router.get("/:id", getForumPostById);

// !!! CRITICAL: Make sure this exact line is at the bottom !!!
module.exports = router;
