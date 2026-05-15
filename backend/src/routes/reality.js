const express = require("express");
const { runRealityCheck } = require("../services/realityService");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { remaining_minutes, current_time } = req.body;

    if (!remaining_minutes) {
      return res.status(400).json({
        status: "error",
        message: "remaining_minutes is required"
      });
    }

    const result = await runRealityCheck({
      remaining_minutes,
      current_time: current_time || null
    });

    res.json(result);
  } catch (error) {
    console.error("Reality check failed:", error);

    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

module.exports = router;