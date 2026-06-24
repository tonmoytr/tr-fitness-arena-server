const { MongoClient } = require("mongodb");

// Fallback to local MongoDB if .env isn't set up yet
const MONGO_URI = "mongodb://127.0.0.1:27017";
const DB_NAME = "tr_fitness_arena";

let client;
let dbInstance = null;

async function connectDatabase() {
  // If already connected, reuse the existing instance (Singleton Pattern)
  if (dbInstance) return dbInstance;

  try {
    console.log("Connecting to MongoDB Client Pool...");

    client = new MongoClient(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Establish the actual connection stream
    await client.connect();

    dbInstance = client.db(DB_NAME);
    console.log(`📡 MongoDB Connected Successfully to Database: "${DB_NAME}"`);

    return dbInstance;
  } catch (error) {
    console.error("❌ MongoDB Connection Failure Error:", error.message);
    process.exit(1); // Kill the server instantly if the database fails to wake up
  }
}

// Utility function to get the open database instance anywhere in our app
function getDb() {
  if (!dbInstance) {
    throw new Error(
      "Must call connectDatabase() before executing database operations.",
    );
  }
  return dbInstance;
}

module.exports = { connectDatabase, getDb };
