const { betterAuth } = require("better-auth");
const { mongodbAdapter } = require("better-auth/adapters/mongodb");
const { getDb } = require("./db");

const auth = betterAuth({
  // FIX: Wrap getDb() in a callback function so it evaluates lazily!
  database: mongodbAdapter(() => getDb()),

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },

  trustedOrigins: [process.env.CLIENT_URL || "http://localhost:3000"],

  advanced: {
    useHostAndProto: true,
  },
});

module.exports = { auth };
