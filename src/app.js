const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://tr-fitness-arena-client.vercel.app/",
    ],
    credentials: true,
  }),
);

// Your normal database routes stay here safely
const classRouter = require("./routes/classRoutes");
app.use("/api/v1/classes", classRouter);

const forumRouter = require("./routes/forumRoutes");
app.use("/api/v1/forums", forumRouter);

const trainerRouter = require("./routes/trainerRoutes");
app.use("/api/v1/trainers", trainerRouter);

const adminRoutes = require("./routes/adminRoutes");
app.use("/api/v1/admin", adminRoutes);

const bookingRouter = require("./routes/bookingRoutes");
app.use("/api/v1", bookingRouter);

module.exports = app;
