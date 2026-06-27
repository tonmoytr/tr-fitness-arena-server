const { getDb, connectDatabase } = require("../config/db");
const { ObjectId } = require("mongodb");

// GET: Fetch all pending applications from the correct collection
const getPendingApplications = async (req, res) => {
  try {
    const db = getDb();

    // FIXED: Query using exact lowercase "pending" to match image_479db7.png
    const applications = await db
      .collection("trainer_applications")
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve trainer application pipelines.",
      error: error.message,
    });
  }
};

// PATCH: Process application approval or rejection with cascade user role promotion
const authorizeTrainerApplication = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status, email, feedback } = req.body; // Capture the dynamic feedback text string

    if (!id || !status || !email) {
      return res
        .status(400)
        .json({ message: "Missing tracking evaluation parameters." });
    }

    const clearStatus = status.toLowerCase();

    // Dynamically package our update modification payload
    const updatePayload = {
      status: clearStatus,
      updatedAt: new Date(),
    };

    // If a rejection feedback reason is submitted, bind it cleanly to the document field
    if (clearStatus === "rejected" && feedback) {
      updatePayload.feedback = feedback;
    }

    const appUpdate = await db
      .collection("trainer_applications")
      .updateOne({ _id: new ObjectId(id) }, { $set: updatePayload });

    if (appUpdate.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: "Target application dossier not found." });
    }

    // Process cascading promotions if status is approved...
    if (clearStatus === "approved") {
      const userDoc = await db.collection("user").findOne({ email: email });
      if (userDoc) {
        await db
          .collection("user")
          .updateOne(
            { _id: userDoc._id },
            { $set: { role: "trainer", updatedAt: new Date() } },
          );
        await db
          .collection("session")
          .updateMany(
            { userId: userDoc._id.toString() },
            { $set: { role: "trainer" } },
          );
      }
    }

    return res
      .status(200)
      .json({ message: `Transaction authorized as ${clearStatus}` });
  } catch (error) {
    res.status(500).json({
      message: "Identity update routing failed.",
      error: error.message,
    });
  }
};

const getAdminDashboardStats = async (req, res) => {
  try {
    const db = getDb();

    // 1. Run parallel document counters and demographic groupings
    const [userStats, totalClasses, classCategories] = await Promise.all([
      // Group users by role to generate distribution percentages
      db
        .collection("user")
        .aggregate([
          {
            $group: {
              _id: "$role",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),

      // Count total classes active across the system
      db.collection("classes").countDocuments({}),

      // Group classes by category to feed the bar chart visual metrics
      db
        .collection("classes")
        .aggregate([
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    // 2. Format user role distributions into a clean key-value dictionary block
    const roleDistribution = { admin: 0, trainer: 0, user: 0 };
    let totalUsersCount = 0;

    userStats.forEach((item) => {
      const roleKey = item._id ? item._id.toLowerCase() : "user";
      if (roleDistribution.hasOwnProperty(roleKey)) {
        roleDistribution[roleKey] = item.count;
      }
      totalUsersCount += item.count;
    });

    // 3. Format class category distributions into a reliable map block
    const categoryDistribution = {};
    classCategories.forEach((item) => {
      const categoryKey = item._id || "General";
      categoryDistribution[categoryKey] = item.count;
    });

    // 4. Dispatch the payload structure to the frontend gateway
    return res.status(200).json({
      totalUsers: totalUsersCount,
      totalClasses: totalClasses,
      estimatedRevenue: totalUsersCount * 49, // Temporary pricing matrix simulation until Stripe hook opens
      roleDistribution,
      categoryDistribution,
    });
  } catch (error) {
    res.status(500).json({
      message: "System failure compiling administrative metrics data grid.",
      error: error.message,
    });
  }
};

// GET: Retrieve all system users with basic credential matrices
const getAllSystemUsers = async (req, res) => {
  try {
    const db = getDb();

    // Fetch all accounts sorted by newest registrations first
    const users = await db
      .collection("user")
      .find({})
      .project({ password: 0 }) // Strict security measure: never leak password hashes down the pipeline
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Failed gathering user account registries.",
      error: error.message,
    });
  }
};

// PATCH: Update authority role permissions across system nodes
const updateUserRole = async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { role } = req.body;

    if (!id || !role) {
      return res
        .status(400)
        .json({ message: "Missing required modification parameters." });
    }

    const cleanRole = role.toLowerCase();
    if (!["user", "trainer", "admin"].includes(cleanRole)) {
      return res
        .status(400)
        .json({ message: "Invalid role authority designation." });
    }

    // Update target account role
    const result = await db
      .collection("user")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: cleanRole, updatedAt: new Date() } },
      );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: "Target account dossier not found." });
    }

    // Cascade role synchronizations down to active session tokens if applicable
    await db
      .collection("session")
      .updateMany({ userId: id }, { $set: { role: cleanRole } });

    return res.status(200).json({
      message: `Account authority role updated to ${cleanRole} successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed updating target authorization matrix.",
      error: error.message,
    });
  }
};

// GET: Retrieve all system classes (Pending items prioritized for immediate auditing)
// const getAllSystemClasses = async (req, res) => {
//   try {
//     const db = getDb();

//     const classes = await db
//       .collection("classes")
//       .find({})
//       .sort({ status: -1, createdAt: -1 }) // Aligns 'pending' statuses alphabetically/chronologically to the top
//       .toArray();

//     return res.status(200).json(classes);
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed gathering global class registry records.",
//       error: error.message,
//     });
//   }
// };

// GET: Retrieve all system classes (Pending items prioritized for immediate auditing)
const getAllSystemClasses = async (req, res) => {
  try {
    await connectDatabase();

    const db = getDb();
    const classes = await db
      .collection("classes")
      .find({})
      .sort({ status: -1, createdAt: -1 })
      .toArray();
    return res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({
      message: "Failed gathering global class registry records.",
      error: error.message,
    });
  }
};

// PATCH: Approve or Reject a training routine template split
const updateClassStatus = async (req, res) => {
  try {
    await connectDatabase();

    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res
        .status(400)
        .json({ message: "Missing required modification status key inputs." });
    }

    const cleanStatus = status.toLowerCase();

    const result = await db
      .collection("classes")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: cleanStatus, updatedAt: new Date() } },
      );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: "Target routine template not found." });
    }

    return res.status(200).json({
      message: `Routine status successfully updated to ${cleanStatus}.`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed executing database state mutation on target class.",
      error: error.message,
    });
  }
};

// DELETE: Permanent structural purge of a routine item block
const deleteSystemClass = async (req, res) => {
  try {
    await connectDatabase();

    const db = getDb();
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ message: "Missing explicit system document identifier." });
    }

    const result = await db
      .collection("classes")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "No matching class entry located to execute drop command.",
      });
    }

    return res.status(200).json({
      message: "Class routine permanently dropped from active registries.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed deleting routine documentation data node.",
      error: error.message,
    });
  }
};

module.exports = {
  getPendingApplications,
  authorizeTrainerApplication,
  getAdminDashboardStats,
  getAllSystemUsers,
  updateUserRole,
  getAllSystemClasses,
  updateClassStatus,
  deleteSystemClass,
};
