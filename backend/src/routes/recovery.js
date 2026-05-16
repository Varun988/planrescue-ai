const express = require("express");
const { recommendRecovery } = require("../services/recoveryService");

const router = express.Router();

router.post("/recommend", async (req, res) => {
  try {
    const { remaining_minutes, current_time, trigger } = req.body;

    if (!remaining_minutes) {
      return res.status(400).json({
        status: "error",
        message: "remaining_minutes is required"
      });
    }

    const recommendation = await recommendRecovery({
      remaining_minutes,
      current_time,
      trigger
    });

    res.json(recommendation);
  } catch (error) {
    console.error("Recovery recommendation failed:", error);

    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

module.exports = router;