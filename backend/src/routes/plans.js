const express = require("express");
const {
  createDemoPlan,
  getCurrentPlan
} = require("../services/planService");

const router = express.Router();

router.post("/demo", async (req, res) => {
  try {
    const result = await createDemoPlan();

    res.status(201).json({
      status: "created",
      message: "Demo plan and tasks created successfully",
      plan: result.plan,
      tasks: result.tasks
    });
  } catch (error) {
    console.error("Failed to create demo plan:", error);

    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

router.get("/current", async (req, res) => {
  try {
    const result = await getCurrentPlan();

    res.json({
      status: "ok",
      plan: result.plan,
      tasks: result.tasks
    });
  } catch (error) {
    console.error("Failed to fetch current plan:", error);

    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

module.exports = router;