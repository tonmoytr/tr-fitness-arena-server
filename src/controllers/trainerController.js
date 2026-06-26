const { getDb } = require("../config/db");
const { ObjectId } = require("mongodb");

// 1. GET STATUS CHECK FOR LOGGED-IN USER
const getApplicationStatus = async (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.query; // Passed via ?userId=xyz

    if (!userId) {
      return res
        .status(400)
        .json({ message: "Missing identification parameter." });
    }

    const application = await db
      .collection("trainer_applications")
      .findOne({ userId });

    // Return the record if found, otherwise return null
    return res.status(200).json({ application });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Status verification breakdown", error: error.message });
  }
};

// 2. PROTECTED POST INSERTION (Updated with block rules)
const handleTrainerApplication = async (req, res) => {
  try {
    const db = getDb();
    const { userId, name, email, image, experience, specialty } = req.body;

    if (!userId || !experience || !specialty) {
      return res
        .status(400)
        .json({ message: "Missing required onboarding parameters." });
    }

    // HARD BLOCK DUPLICATES: Check if this user already has any application record
    const existingApplication = await db
      .collection("trainer_applications")
      .findOne({ userId });
    if (existingApplication) {
      return res.status(400).json({
        message: `Action restricted. You already have an application with status: ${existingApplication.status}`,
      });
    }

    const applicationData = {
      userId,
      name,
      email,
      image,
      experience: parseInt(experience),
      specialty,
      status: "pending", // Default assignment status remains pending
      feedback: null,
      createdAt: new Date(),
    };

    await db.collection("trainer_applications").insertOne(applicationData);
    return res
      .status(201)
      .json({ message: "Trainer onboarding request logged successfully!" });
  } catch (error) {
    res.status(500).json({
      message: "Application pipeline processing failure",
      error: error.message,
    });
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

module.exports = {
  handleTrainerApplication,
  getApplicationStatus,
  handleCreateClass,
  getUserDashboardMetrics,
  getTrainerDashboardMetrics,
  getClassesByTrainer,
  deleteClassById,
  updateClassById,
};
