const { getDb } = require("../config/db");

// Controller logic to fetch all approved classes from MongoDB Atlas
const getAllClasses = async (req, res) => {
  try {
    const db = getDb();

    // Pro Strategy: Filter by "Approved" status to protect public views
    const approvedClasses = await db
      .collection("classes")
      .find({ status: "Approved" })
      .sort({ createdAt: -1 }) // Newly added classes show up first
      .toArray();

    // Send data back to frontend with standard HTTP 200 Success status
    res.status(200).json(approvedClasses);
  } catch (error) {
    console.error("❌ Error inside getAllClasses Controller:", error.message);
    res
      .status(500)
      .json({
        message: "Failed to retrieve approved classes from the database.",
      });
  }
};

module.exports = { getAllClasses };
