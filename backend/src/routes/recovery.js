const express = require("express");

const {
  recommendRecovery,
  applyRecoveryPlan
} = require("../services/recoveryService");
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

router.post("/apply", async (req, res) => {
  try {
    const { plan_id, trigger, actions, approved_by_user } = req.body;

    if (!approved_by_user) {
      return res.status(400).json({
        status: "approval_required",
        message: "approved_by_user must be true before applying recovery."
      });
    }

    const result = await applyRecoveryPlan({
      plan_id,
      trigger,
      actions,
      approved_by_user
    });

    res.json(result);
  } catch (error) {
    console.error("Apply recovery failed:", error);

    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

module.exports = router;