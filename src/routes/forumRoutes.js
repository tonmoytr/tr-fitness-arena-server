const express = require("express");
const router = express.Router();
const {
  getLatestForumPosts,
  getForumPostById,
  handleCommentAction,
  handleForumVote,
} = require("../controllers/forumController");

router.get("/", getLatestForumPosts);

// Dynamic ID path matches: GET /api/v1/forums/:id
router.get("/:id", getForumPostById);

router.patch("/:id/vote", handleForumVote);
router.post("/:id/comments", handleCommentAction);

// !!! CRITICAL: Make sure this exact line is at the bottom !!!
module.exports = router;
