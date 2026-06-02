const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

const connectDatabase = async () => {
  try {
    let uri = process.env.MONGO_URI;

    // If no external MongoDB, use in-memory server (free, zero-install)
    if (!uri || uri.includes("localhost")) {
      try {
        // Try connecting to local MongoDB first
        await mongoose.connect(uri || "mongodb://localhost:27017/trendy-ecommerce", {
          serverSelectionTimeoutMS: 3000,
        });
        console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
        return;
      } catch {
        // Fall back to in-memory MongoDB
        console.log("⚡ Local MongoDB not found, starting in-memory server...");
        mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
      }
    }

    await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host} ${mongoServer ? "(in-memory)" : ""}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDatabase;
