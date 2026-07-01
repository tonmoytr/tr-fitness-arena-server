const express = require("express");
const router = express.Router();
const {
  createBookingRecord,
  getBookingsByUser,
} = require("../controllers/bookingController");

// Endpoint to securely register a Stripe-verified booking
router.post("/bookings/confirm", createBookingRecord);

// Endpoint to retrieve all bookings for a user
router.get("/bookings", getBookingsByUser);

module.exports = router;
