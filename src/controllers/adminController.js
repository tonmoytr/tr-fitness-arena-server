const { getDb } = require("../config/db");
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
    res
      .status(500)
      .json({
        message: "Identity update routing failed.",
        error: error.message,
      });
  }
};
module.exports = {
  getPendingApplications,
  authorizeTrainerApplication,
};
