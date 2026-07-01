const { ObjectId } = require("mongodb");
const { getDb, connectDatabase } = require("../config/db");

// 1. CREATE BOOKING RECORD
const createBookingRecord = async (req, res) => {
  try {
    await connectDatabase();
    const db = getDb();

    const { classId, userId, amountPaid, transactionId } = req.body;

    if (!classId || !userId) {
      return res
        .status(400)
        .json({ message: "Missing vital booking identities." });
    }

    // Convert string classId into MongoDB ObjectId safely
    let classObjectId;
    try {
      classObjectId = new ObjectId(classId);
    } catch (err) {
      return res.status(400).json({ message: "Invalid class identification key format." });
    }

    // Prevent duplicate bookings
    const existingBooking = await db.collection("bookings").findOne({
      userId: userId,
      classId: classObjectId,
    });

    if (existingBooking) {
      return res
        .status(400)
        .json({ message: "You are already reserved in this session." });
    }

    // Create the booking receipt
    const bookingReceipt = {
      userId,
      classId: classObjectId,
      amountPaid,
      transactionId,
      paymentStatus: "paid",
      createdAt: new Date(),
    };

    await db.collection("bookings").insertOne(bookingReceipt);

    // Update capacity metrics: Increment bookingCount and decrement availableSlots
    await db.collection("classes").updateOne(
      { _id: classObjectId },
      {
        $inc: { bookingCount: 1, availableSlots: -1 },
      }
    );

    return res
      .status(201)
      .json({
        message: "Slot reservation successfully secured!",
        booking: bookingReceipt,
      });
  } catch (error) {
    console.error("Booking Controller Error:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server registration breakdown." });
  }
};

// 2. GET BOOKINGS FOR USER (WITH CLASS DETAILS RESOLUTION)
const getBookingsByUser = async (req, res) => {
  try {
    await connectDatabase();
    const db = getDb();

    const { userId } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "Missing user identification query token." });
    }

    // Run MongoDB Aggregation Pipeline to resolve class details
    const bookings = await db
      .collection("bookings")
      .aggregate([
        {
          $match: {
            userId: userId,
            paymentStatus: "paid",
          },
        },
        {
          $lookup: {
            from: "classes",
            localField: "classId",
            foreignField: "_id",
            as: "classDetails",
          },
        },
        {
          $unwind: {
            path: "$classDetails",
            preserveNullAndEmptyArrays: false,
          },
        },
      ])
      .toArray();

    // Map bookings documents into the structural schema required by Client table
    const formattedBookings = bookings.map((item) => ({
      _id: item._id,
      classId: item.classId.toString(),
      className: item.classDetails.className,
      trainerName: item.classDetails.trainer?.name || "Lead Coach",
      schedule: `${
        item.classDetails.classSchedule?.days?.join(", ") || ""
      } at ${item.classDetails.classSchedule?.time || ""}`,
    }));

    return res.status(200).json(formattedBookings);
  } catch (error) {
    console.error("Fetch User Bookings Controller Error:", error.message);
    return res
      .status(500)
      .json({ message: "Failed compiling user booking logs." });
  }
};

module.exports = {
  createBookingRecord,
  getBookingsByUser,
};
