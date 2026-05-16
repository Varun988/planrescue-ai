const express = require("express");
const { simulateNewCommitment } = require("../services/commitmentService");

const router = express.Router();

router.post("/simulate", async (req, res) => {
  try {
    const { title, estimated_minutes, priority, deadline } = req.body;

    if (!title) {
      return res.status(400).json({
        status: "error",
        message: "title is required"
      });
    }

    if (!estimated_minutes) {
      return res.status(400).json({
        status: "error",
        message: "estimated_minutes is required"
      });
    }

    const result = await simulateNewCommitment({
      title,
      estimated_minutes,
      priority,
      deadline
    });

    res.json(result);
  } catch (error) {
    console.error("Commitment simulation failed:", error);

    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

module.exports = router;