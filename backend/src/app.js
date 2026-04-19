require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const playerRoutes = require("./routes/playerRoutes");
const teamRoutes = require("./routes/teamRoutes");
const transferRoutes = require("./routes/transferRoutes");
const aiRoutes = require("./routes/aiRoutes");
const commentRoutes = require("./routes/commentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { ensureDatabaseConnection, isDatabaseAvailable } = require("./utils/database");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
const hasFrontendBuild = fs.existsSync(frontendDistPath);

app.use( 
  cors({
    origin(origin, callback) {
      if (!origin || !ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin denied"));
    },
  })
);

app.use(express.json());

app.use(
  [
    "/users",
    "/players",
    "/teams",
    "/transfers",
    "/ai",
    "/admin",
    "/api/players",
    "/api/teams",
    "/api/comments",
  ],
  async (req, res, next) => {
    try {
      await ensureDatabaseConnection();
    } catch (error) {
      console.error("MongoDB baglantisi kurulamadi:", error.message);
    }

    next();
  }
);

function buildHealthPayload() {
  return {
    name: "TRANSFERA API",
    status: isDatabaseAvailable() ? "ok" : "degraded",
    version: "1.0.0",
    database: isDatabaseAvailable() ? "connected" : "disconnected",
  };
}

app.get("/api/health", async (req, res) => {
  try {
    await ensureDatabaseConnection();
  } catch (error) {
    console.error("Health check sirasinda MongoDB baglantisi kurulamadi:", error.message);
  }
  res.json(buildHealthPayload());
});

app.use("/users", userRoutes);
app.use("/players", playerRoutes);
app.use("/teams", teamRoutes);
app.use("/transfers", transferRoutes);
app.use("/ai", aiRoutes);
app.use("/admin", adminRoutes);
app.use("/api/players", commentRoutes);
app.use("/api/teams", commentRoutes);
app.use("/api/comments", commentRoutes);

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));

  app.get(/^\/(?!users|players|teams|transfers|ai|admin|api)(.*)$/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.get("/", async (req, res) => {
  if (hasFrontendBuild) {
    return res.sendFile(path.join(frontendDistPath, "index.html"));
  }

  try {
    await ensureDatabaseConnection();
  } catch (error) {
    console.error("Root isteginde MongoDB baglantisi kurulamadi:", error.message);
  }
  return res.json(buildHealthPayload());
});

app.use((req, res) => {
  res.status(404).json({ message: "Endpoint bulunamadi." });
});

async function startServer() {
  app.listen(PORT, () => {
    console.log(`Server calisiyor: http://localhost:${PORT}`);
  });

  try {
    await ensureDatabaseConnection();
    console.log("MongoDB baglandi.");
  } catch (error) {
    console.error(
      "MongoDB baglantisi kurulamadi, sunucu sinirli modda calisiyor:",
      error.message
    );
  }
}

mongoose.connection.on("connected", () => {
  console.log("MongoDB baglantisi aktif.");
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB baglantisi kesildi. API sinirli modda devam ediyor.");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB hatasi:", error.message);
});

ensureDatabaseConnection().catch((error) => {
  console.error(
    "Ilk MongoDB baglantisi kurulamadi, sunucu sinirli modda calisiyor:",
    error.message
  );
});

if (require.main === module) {
  startServer();
}

module.exports = app;
