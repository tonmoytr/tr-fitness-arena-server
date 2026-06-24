// 1. Load environment variables first before any other code executes
require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 2. Open the MongoDB connection pool
    await connectDatabase();

    // 3. Start local network listener
    app.listen(PORT, () => {
      console.log(
        `🚀 Server running locally in ${process.env.NODE_ENV} mode on port: ${PORT}`,
      );
    });
  } catch (error) {
    console.error(
      "❌ Failed to initialize application server startup:",
      error.message,
    );
    process.exit(1);
  }
}

startServer();
