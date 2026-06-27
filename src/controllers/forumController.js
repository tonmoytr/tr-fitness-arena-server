const { ObjectId } = require("mongodb");
const { getDb } = require("../config/db");

const handleForumVote = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { userId, voteType } = req.body;

    if (!userId || !["like", "dislike"].includes(voteType)) {
      return res.status(400).json({ message: "Invalid payload parameters." });
    }

    const forumPost = await db
      .collection("forums")
      .findOne({ _id: new ObjectId(id) });
    if (!forumPost)
      return res.status(404).json({ message: "Forum post not found." });

    // Initialize arrays if they don't exist yet
    const likedBy = forumPost.likedBy || [];
    const dislikedBy = forumPost.dislikedBy || [];

    let updateQuery = {};

    if (voteType === "like") {
      if (likedBy.includes(userId)) {
        // Toggle Off: Already liked, remove it
        updateQuery = { $pull: { likedBy: userId } };
      } else {
        // Toggle On: Add to likedBy, remove from dislikedBy
        updateQuery = {
          $addToSet: { likedBy: userId },
          $pull: { dislikedBy: userId },
        };
      }
    } else if (voteType === "dislike") {
      if (dislikedBy.includes(userId)) {
        // Toggle Off: Already disliked, remove it
        updateQuery = { $pull: { dislikedBy: dislikedBy } };
      } else {
        // Toggle On: Add to dislikedBy, remove from likedBy
        updateQuery = {
          $addToSet: { dislikedBy: userId },
          $pull: { likedBy: userId },
        };
      }
    }

    // Apply the operation to MongoDB
    await db
      .collection("forums")
      .updateOne({ _id: new ObjectId(id) }, updateQuery);

    // Fetch and return the fresh arrays back to the client immediately
    const updatedPost = await db
      .collection("forums")
      .findOne({ _id: new ObjectId(id) });

    return res.status(200).json({
      likedBy: updatedPost.likedBy || [],
      dislikedBy: updatedPost.dislikedBy || [],
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Voting pipeline failure", error: error.message });
  }
};

// 2. COMMENT CRUD CONTROLLER
const handleCommentAction = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params; // Forum Post ID
    const { action, commentId, userId, userName, userImage, text } = req.body;

    const forumId = new ObjectId(id);

    // CREATE (Add Comment)
    if (action === "CREATE") {
      const newComment = {
        _id: new ObjectId().toString(),
        userId,
        userName,
        userImage,
        text,
        createdAt: new Date(),
      };
      await db
        .collection("forums")
        .updateOne(
          { _id: forumId },
          { $push: { comments: newComment }, $inc: { commentsCount: 1 } },
        );
      return res
        .status(201)
        .json({ message: "Comment posted", comment: newComment });
    }

    // UPDATE (Edit Comment)
    if (action === "UPDATE") {
      await db.collection("forums").updateOne(
        {
          _id: forumId,
          "comments._id": commentId,
          "comments.userId": userId,
        },
        {
          $set: {
            "comments.$.text": text,
            "comments.$.updatedAt": new Date(),
          },
        },
      );
      return res.status(200).json({ message: "Comment updated successfully" });
    }

    // DELETE (Remove Comment)
    if (action === "DELETE") {
      await db.collection("forums").updateOne(
        { _id: forumId },
        {
          $pull: { comments: { _id: commentId, userId: userId } },
          $inc: { commentsCount: -1 },
        },
      );
      return res.status(200).json({ message: "Comment deleted successfully" });
    }

    res
      .status(400)
      .json({ message: "Invalid CRUD action variant parameters." });
  } catch (error) {
    res.status(500).json({
      message: "Comment CRUD execution breakdown",
      error: error.message,
    });
  }
};

// Controller to pull down approved discussions in a chronological flow
const getLatestForumPosts = async (req, res) => {
  try {
    const db = getDb();

    const posts = await db
      .collection("forums")
      .find({ status: "approved" })
      .sort({ createdAt: -1 }) // Sort newest directly inside MongoDB (Much faster than JS memory sort!)
      .toArray();

    res.status(200).json(posts);
  } catch (error) {
    console.error(
      "❌ Error inside getLatestForumPosts Controller:",
      error.message,
    );
    res
      .status(500)
      .json({ message: "Failed to retrieve public discussion indexes." });
  }
};

const getForumPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Look up the document using MongoDB's native ObjectId format
    const post = await db
      .collection("forums")
      .findOne({ _id: new ObjectId(id) });

    if (!post) {
      return res
        .status(404)
        .json({ message: "Target community discussion could not be located." });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error(
      `❌ Error inside getForumPostById for ID ${req.params.id}:`,
      error.message,
    );
    res.status(500).json({
      message: "Internal Server Error parsing post identity parameter.",
    });
  }
};

module.exports = {
  getLatestForumPosts,
  getForumPostById,
  handleForumVote,
  handleCommentAction,
};
