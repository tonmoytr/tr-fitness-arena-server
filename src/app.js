const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();

/* ==========================================================================
   1. GLOBAL MIDDLEWARE INTERCEPTION STACK
   ========================================================================== */

// Protect secure response layout headers
app.use(helmet());

// Log processing speeds directly into your terminal
app.use(morgan("dev"));

// Allow cross-origin data fetches from your Next.js client URL parameter
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Parse raw parsing components to handle clean JSON payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==========================================================================
   2. CORE SYSTEM HEALTH INTERFACES
   ========================================================================== */

// Base connectivity verification test path
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "active",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Register your dynamic Classes feature router node here!
const classRouter = require("./routes/classRoutes");
app.use("/api/v1/classes", classRouter);

module.exports = app;
