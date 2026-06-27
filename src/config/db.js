const { MongoClient, ServerApiVersion } = require("mongodb");

// Pull the secure string directly from our .env file
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = "tr_fitness_arena";

let client;
let dbInstance = null;

async function connectDatabase() {
  if (dbInstance) return dbInstance;

  try {
    console.log("Initializing secure MongoDB Atlas client connection...");

    // Using your exact configuration parameters from MongoDB
    client = new MongoClient(MONGO_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    // Connect to the Atlas cluster
    await client.connect();

    // Ping the deployment to confirm connection health (Your exact ping check!)
    await client.db("admin").command({ ping: 1 });

    dbInstance = client.db(DB_NAME);
    console.log(
      `📡 Successfully pinged and connected to MongoDB Atlas: "${DB_NAME}"`,
    );

    return dbInstance;
  } catch (error) {
    console.error("❌ Critical Database Connection Failure:", error.message);
    process.exit(1);
  }
}

function getDb() {
  if (!dbInstance) {
    throw new Error(
      "Must call connectDatabase() before running transaction queries.",
    );
  }
  return dbInstance;
}

module.exports = { connectDatabase, getDb };
