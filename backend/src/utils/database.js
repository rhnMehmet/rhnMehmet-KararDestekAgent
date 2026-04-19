const mongoose = require("mongoose");

let databaseConnectionPromise = null;

function isDatabaseAvailable() {
  return mongoose.connection.readyState === 1;
}

async function ensureDatabaseConnection() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (databaseConnectionPromise) {
    return databaseConnectionPromise;
  }

  const MONGODB_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/transfera";
  const serverSelectionTimeoutMS = Number(
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000
  );

  databaseConnectionPromise = mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS,
    })
    .then((connection) => {
      return connection;
    })
    .catch((error) => {
      databaseConnectionPromise = null;
      throw error;
    });

  return databaseConnectionPromise;
}

function createDatabaseUnavailableError(
  message = "Veritabanı şu anda  kullanılamıyor."
) {
  const error = new Error(message);
  error.statusCode = 503;
  return error;
}

function buildDatabaseUnavailablePayload(message) {
  return {
    message: message || "Veritabanı bağlantısı şu anda kullanılamıyor.",
    code: "DATABASE_UNAVAILABLE",
  };
}

module.exports = {
  isDatabaseAvailable,
  ensureDatabaseConnection,
  createDatabaseUnavailableError,
  buildDatabaseUnavailablePayload,
};
