const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "planrescue";

let client;
let db;

async function connectToMongo() {
  if (db) {
    return db;
  }

  if (!uri) {
    throw new Error("MONGODB_URI is missing. Please check backend/.env");
  }

  client = new MongoClient(uri);
  await client.connect();

  db = client.db(dbName);
  console.log(`Connected to MongoDB database: ${dbName}`);

  return db;
}

async function getDb() {
  return connectToMongo();
}

async function closeMongoConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  connectToMongo,
  getDb,
  closeMongoConnection
};