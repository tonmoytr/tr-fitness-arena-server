const { ObjectId } = require("mongodb");
const { getDb, connectDatabase } = require("../config/db");

// Controller logic to fetch all approved classes from MongoDB Atlas
const getAllClasses = async (req, res) => {
  try {
    // 1. SERVERLESS GUARD: Await connection resolution before continuing
    // If already connected, this returns instantly. If cold starting, it waits for the connection to establish.
    await connectDatabase();

    const db = getDb();

    // 2. Execute target document lookup matching our lowercase structural filter
    const approvedClasses = await db
      .collection("classes")
      .find({ status: "approved" })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(approvedClasses);
  } catch (error) {
    console.error("❌ Error inside getAllClasses Controller:", error.message);
    res.status(500).json({
      message: "Failed to retrieve approved classes from the database.",
    });
  }
};

const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const classData = await db
      .collection("classes")
      .findOne({ _id: new ObjectId(id) });

    if (!classData) {
      return res.status(404).json({ message: "Class not found." });
    }

    res.status(200).json(classData);
  } catch (error) {
    console.error("❌ Error inside getClassById Controller:", error.message);
    res.status(500).json({
      message: "Failed to retrieve class by ID from the database.",
    });
  }
};

// 1. ADD TO FAVORITES CONTROLLER WITH DUPLICATE CHECKING
const handleAddFavorite = async (req, res) => {
  try {
    const db = getDb();
    const { classId, userId } = req.body;

    if (!classId || !userId) {
      return res
        .status(400)
        .json({ message: "Missing required identification parameters." });
    }

    // Validation: Check the favorites collection to prevent duplicate entries
    const existingFavorite = await db.collection("favorites").findOne({
      classId: classId,
      userId: userId,
    });

    if (existingFavorite) {
      return res.status(400).json({
        message: "This module is already saved in your favorites list.",
      });
    }

    // Action: Save the class to the user's favorites collection
    const favoriteRecord = {
      classId,
      userId,
      createdAt: new Date(),
    };

    await db.collection("favorites").insertOne(favoriteRecord);
    return res
      .status(201)
      .json({ message: "Successfully added to your favorites!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Favorites pipeline breakdown", error: error.message });
  }
};

// 2. CHECK BOOKING STATUS CONTROLLER
const checkClassStatus = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params; // Class ID
    const { userId } = req.query; // Passed via URL params (?userId=xyz)

    if (!userId) {
      return res.status(400).json({ message: "Missing user identity token." });
    }

    // Validation: Check bookings collection to see if logged-in user booked it
    const hasBooked = await db.collection("bookings").findOne({
      classId: id,
      userId: userId,
      paymentStatus: "paid", // Ensures checkout loop was completed successfully
    });

    // Validation: Check favorites collection for UI state syncing
    const isFavorite = await db.collection("favorites").findOne({
      classId: id,
      userId: userId,
    });

    return res.status(200).json({
      alreadyBooked: !!hasBooked,
      isFavorite: !!isFavorite,
    });
  } catch (error) {
    res.status(500).json({
      message: "Status verification loop timeout",
      error: error.message,
    });
  }
};

// Fetch all favorites for a specific user, joining class information
const getUserFavorites = async (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "Missing user identification token." });
    }

    // 1. Find all favorite records for the user
    const favorites = await db
      .collection("favorites")
      .find({ userId })
      .toArray();

    if (favorites.length === 0) {
      return res.status(200).json({ favorites: [] });
    }

    // 2. Map through favorites and convert classId strings to ObjectIds for lookups
    const classIds = favorites.map((f) => new ObjectId(f.classId));

    // 3. Fetch the full class details for those IDs
    const classes = await db
      .collection("classes")
      .find({ _id: { $in: classIds } })
      .toArray();

    return res.status(200).json({ favorites: classes });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve favorites stream.",
      error: error.message,
    });
  }
};

// Delete an item from the user's favorites list
const handleDeleteFavorite = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params; // Class ID
    const { userId } = req.query;

    if (!id || !userId) {
      return res
        .status(400)
        .json({ message: "Missing required identification parameters." });
    }

    const result = await db
      .collection("favorites")
      .deleteOne({ classId: id, userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Favorite log index not found." });
    }

    return res
      .status(200)
      .json({ message: "🗑️ Removed from favorites collection." });
  } catch (error) {
    res.status(500).json({
      message: "Failed to drop favorite entry.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllClasses,
  getClassById,
  handleAddFavorite,
  checkClassStatus,
  getUserFavorites,
  handleDeleteFavorite,
};
