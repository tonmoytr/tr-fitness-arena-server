const { ObjectId } = require("mongodb");
const { getDb } = require("../config/db");

// Controller to pull down approved discussions in a chronological flow
const getLatestForumPosts = async (req, res) => {
  try {
    const db = getDb();

    const posts = await db
      .collection("forums")
      .find({ status: "Approved" })
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
    res
      .status(500)
      .json({
        message: "Internal Server Error parsing post identity parameter.",
      });
  }
};

module.exports = { getLatestForumPosts, getForumPostById };
