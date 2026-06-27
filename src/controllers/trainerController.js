const { getDb } = require("../config/db");
const { ObjectId } = require("mongodb");

// 1. GET STATUS CHECK FOR LOGGED-IN USER
const getApplicationStatus = async (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "Missing tracking user identification query parameters.",
      });
    }

    // FIXED: Target the collection and sort to guarantee we get the active matrix record
    const application = await db
      .collection("trainer_applications")
      .find({ userId: userId })
      .sort({ updatedAt: -1, createdAt: -1 }) // Get the absolute newest document first
      .limit(1)
      .toArray();

    return res.status(200).json(application[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. PROTECTED POST INSERTION (Updated with block rules)
const handleTrainerApplication = async (req, res) => {
  try {
    const db = getDb();
    const { userId, name, email, image, experience, specialty } = req.body;

    if (!userId || !name || !email || !experience || !specialty) {
      return res
        .status(400)
        .json({ message: "Validation failure. Missing key attributes." });
    }

    // FIXED: Enforce a single document per user using updateOne + upsert
    await db.collection("trainer_applications").updateOne(
      { userId: userId }, // Find by unique user ID
      {
        $set: {
          name,
          email,
          image,
          experience: Number(experience),
          specialty,
          status: "pending", // Reset back to pending immediately
          feedback: null, // Wipe out the old rejection reason completely
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }, // If it doesn't exist, create it; if it does, overwrite it!
    );

    return res
      .status(200)
      .json({ message: "Application logged successfully in system pipeline." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const handleCreateClass = async (req, res) => {
  try {
    const db = getDb();
    const {
      className,
      image,
      category,
      difficultyLevel,
      duration,
      price,
      description,
      days,
      time,
      trainerId,
      trainerName,
      trainerEmail,
    } = req.body;

    // Strict parameter validation check
    if (!className || !image || !category || !price || !trainerId) {
      return res
        .status(400)
        .json({ message: "Missing mandatory configuration criteria fields." });
    }

    const newClassDocument = {
      className,
      image,
      category,
      difficultyLevel: difficultyLevel || "Beginner",
      duration: parseInt(duration) || 60,
      price: parseFloat(price),
      description,
      classSchedule: {
        days: Array.isArray(days) ? days : [days],
        time,
      },
      trainer: {
        id: trainerId,
        name: trainerName,
        email: trainerEmail,
      },
      bookingCount: 0, // Freshly initialized class has zero allocations
      status: "pending", // CRITICAL: Core requirement specifies default must be pending
      createdAt: new Date(),
    };

    await db.collection("classes").insertOne(newClassDocument);
    return res.status(201).json({
      message: "Fitness blueprint registered with status: pending review!",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed compiling class index document.",
      error: error.message,
    });
  }
};
const getUserDashboardMetrics = async (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "Missing user identification query token." });
    }

    // 1. Fetch exact real-time document counts for metrics cards
    const totalBooked = await db
      .collection("bookings")
      .countDocuments({ userId, paymentStatus: "paid" });
    const totalFavorites = await db
      .collection("favorites")
      .countDocuments({ userId });

    // 2. Locate the active onboarding tracking application document
    const application = await db
      .collection("trainer_applications")
      .findOne({ userId });

    // 3. Return explicit property fields that match the expectations of your frontend layout
    return res.status(200).json({
      totalBooked,
      totalFavorites,
      applicationStatus: application?.status || "none", // Ensures 'pending', 'rejected', etc. map correctly
      adminFeedback: application?.feedback || null, // Matches page requirement for admin messages
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed compiling user dashboard logs.",
      error: error.message,
    });
  }
};

const getTrainerDashboardMetrics = async (req, res) => {
  try {
    const db = getDb();
    const { trainerId } = req.query;

    if (!trainerId) {
      return res
        .status(400)
        .json({ message: "Missing trainer identification parameter." });
    }

    // 1. Fetch all classes created by this specific trainer
    const trainerClasses = await db
      .collection("classes")
      .find({ "trainer.id": trainerId })
      .toArray();

    const totalClassesCreated = trainerClasses.length;

    // 2. Sum up the booking counts across all of this trainer's classes
    const totalStudentsEnrolled = trainerClasses.reduce((sum, cls) => {
      return sum + (cls.bookingCount || 0);
    }, 0);

    return res.status(200).json({
      totalClassesCreated,
      totalStudentsEnrolled,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed compiling trainer dashboard logs.",
      error: error.message,
    });
  }
};

// Fetch all classes created by the logged-in trainer
const getClassesByTrainer = async (req, res) => {
  try {
    const db = getDb();
    const { trainerId } = req.query;

    if (!trainerId) {
      return res
        .status(400)
        .json({ message: "Missing trainer identification parameter." });
    }

    const classes = await db
      .collection("classes")
      .find({ "trainer.id": trainerId })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch trainer's classes.",
      error: error.message,
    });
  }
};

// Delete a class route handler
const deleteClassById = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ message: "Missing class configuration identity token." });
    }

    const result = await db
      .collection("classes")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "Target class document not found." });
    }

    return res
      .status(200)
      .json({ message: "🗑️ Class routine permanently wiped from database." });
  } catch (error) {
    res.status(500).json({
      message: "Failed to drop class document record.",
      error: error.message,
    });
  }
};

const updateClassById = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const {
      className,
      image,
      category,
      difficultyLevel,
      duration,
      price,
      description,
      time,
      days,
    } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ message: "Missing class allocation identifier token." });
    }

    const updatedDocument = {
      className,
      image,
      category,
      difficultyLevel,
      duration: parseInt(duration) || 60,
      price: parseFloat(price),
      description,
      classSchedule: {
        days: Array.isArray(days) ? days : [days],
        time,
      },
      status: "pending", // CRITICAL: Re-editing resets validation status back to pending moderation
      updatedAt: new Date(),
    };

    const result = await db
      .collection("classes")
      .updateOne({ _id: new ObjectId(id) }, { $set: updatedDocument });

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: "Target class matrix card not found." });
    }

    return res
      .status(200)
      .json({ message: "Class updated and returned to moderation pipeline." });
  } catch (error) {
    res.status(500).json({
      message: "Failed executing update transaction.",
      error: error.message,
    });
  }
};

const createForumPost = async (req, res) => {
  try {
    const db = getDb();
    const {
      title,
      content,
      image,
      authorId,
      authorName,
      authorEmail,
      authorRole,
    } = req.body;

    if (!title || !content || !image) {
      return res
        .status(400)
        .json({ message: "Missing required forum post content structures." });
    }

    const newPost = {
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, ""),
      category: "General",
      image,
      content,
      author: {
        id: authorId,
        name: authorName,
        email: authorEmail,
        role: authorRole,
      },
      upvotes: [],
      downvotes: [],
      commentsCount: 0,
      status: "Pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("forums").insertOne(newPost);
    return res.status(201).json({
      message: "Forum post created successfully.",
      postId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed logging forum contribution record.",
      error: error.message,
    });
  }
};

// Fetch forum posts created exclusively by the logged-in trainer
const getForumPostsByTrainer = async (req, res) => {
  try {
    const db = getDb();
    const { authorId } = req.query;

    if (!authorId) {
      return res
        .status(400)
        .json({ message: "Missing author identity matrix mapping key." });
    }

    const posts = await db
      .collection("forums")
      .find({ "author.id": authorId })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({
      message: "Failed tracking down author profile documents.",
      error: error.message,
    });
  }
};

// Delete forum entry
const deleteForumPostById = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ message: "Missing target forum asset identifier." });
    }

    const result = await db
      .collection("forums")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "Target forum article not found." });
    }

    return res
      .status(200)
      .json({ message: "Article pulled cleanly from public board arrays." });
  } catch (error) {
    res.status(500).json({
      message: "Failed executing erasure pipeline.",
      error: error.message,
    });
  }
};

// DELETE: Reset application history for a rejected user
// DELETE: Clean out a user's rejected application history
const resetRejectedApplication = async (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "Missing required user identity mapping matrix." });
    }

    // FIXED: Target status: "rejected" to match what is actually written in your database
    const result = await db.collection("trainer_applications").deleteOne({
      userId: userId,
      status: "rejected",
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "No matching rejected document found to clear." });
    }

    return res
      .status(200)
      .json({
        message: "Application history successfully purged from registry.",
      });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed executing reset pipeline.",
        error: error.message,
      });
  }
};



module.exports = {
  handleTrainerApplication,
  getApplicationStatus,
  handleCreateClass,
  getUserDashboardMetrics,
  getTrainerDashboardMetrics,
  getClassesByTrainer,
  deleteClassById,
  updateClassById,
  createForumPost,
  getForumPostsByTrainer,
  deleteForumPostById,
  resetRejectedApplication,
};
