const { getDb } = require("../config/db");

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
    return res
      .status(201)
      .json({
        message: "Fitness blueprint registered with status: pending review!",
      });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed compiling class index document.",
        error: error.message,
      });
  }
};

module.exports = {
  handleTrainerApplication,
  getApplicationStatus,
  handleCreateClass,
};
