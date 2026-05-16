const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectToMongo } = require("./services/mongoService");
const plansRouter = require("./routes/plans");
const realityRouter = require("./routes/reality");
const recoveryRouter = require("./routes/recovery");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/plans", plansRouter);
app.use("/api/reality-check", realityRouter);

app.use("/api/recovery", recoveryRouter);

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.json({
    app: "PlanRescue AI Backend",
    status: "running",
    message: "Backend is healthy"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "planrescue-backend"
  });
});

app.get("/health/db", async (req, res) => {
  try {
    const db = await connectToMongo();

    await db.command({ ping: 1 });

    res.json({
      status: "ok",
      database: "connected",
      dbName: db.databaseName
    });
  } catch (error) {
    console.error("MongoDB health check failed:", error);

    res.status(500).json({
      status: "error",
      database: "not_connected",
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`PlanRescue AI backend running on port ${PORT}`);
});
