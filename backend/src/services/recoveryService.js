const { randomUUID } = require("crypto");
const { getDb } = require("./mongoService");
const { getCurrentPlan } = require("./planService");

function getPendingTasks(tasks) {
  return tasks.filter((task) => task.status === "pending");
}

function getPriorityWeight(priority) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function getFlexibilityWeight(flexibility) {
  if (flexibility === "low") return 3;
  if (flexibility === "medium") return 2;
  return 1;
}

function getTaskDecisionScore(task) {
  return getPriorityWeight(task.priority) + getFlexibilityWeight(task.flexibility);
}

function sortTasksForRecovery(tasks) {
  return [...tasks].sort((a, b) => {
    return getTaskDecisionScore(b) - getTaskDecisionScore(a);
  });
}

function createRecoveryActions(tasks, remainingMinutes) {
  const sortedTasks = sortTasksForRecovery(tasks);

  let usedMinutes = 0;
  const actions = [];

  for (const task of sortedTasks) {
    const estimatedMinutes = Number(task.estimated_minutes || 0);
    const remainingCapacity = remainingMinutes - usedMinutes;

    if (
      task.priority === "high" &&
      task.flexibility === "low" &&
      estimatedMinutes <= remainingCapacity
    ) {
      actions.push({
        task_id: task.task_id,
        title: task.title,
        action: "keep",
        original_minutes: estimatedMinutes,
        new_minutes: estimatedMinutes,
        reason: "High priority, low flexibility, and fits in the remaining time."
      });

      usedMinutes += estimatedMinutes;
      continue;
    }

    if (task.priority === "high" && estimatedMinutes <= remainingCapacity) {
      actions.push({
        task_id: task.task_id,
        title: task.title,
        action: "keep",
        original_minutes: estimatedMinutes,
        new_minutes: estimatedMinutes,
        reason: "High priority task that still fits in the recovered schedule."
      });

      usedMinutes += estimatedMinutes;
      continue;
    }

    if (
      task.priority !== "low" &&
      task.flexibility !== "low" &&
      estimatedMinutes > remainingCapacity &&
      remainingCapacity >= 20
    ) {
      actions.push({
        task_id: task.task_id,
        title: task.title,
        action: "shorten",
        original_minutes: estimatedMinutes,
        new_minutes: remainingCapacity,
        reason:
          "Useful task, but full scope no longer fits. Recommended as a shorter progress block."
      });

      usedMinutes += remainingCapacity;
      continue;
    }

    if (task.category === "health" && remainingCapacity >= 10) {
      actions.push({
        task_id: task.task_id,
        title: task.title,
        action: "convert",
        original_minutes: estimatedMinutes,
        new_minutes: 10,
        reason: "Converted to a small recovery-friendly version to preserve momentum."
      });

      usedMinutes += 10;
      continue;
    }

    actions.push({
      task_id: task.task_id,
      title: task.title,
      action: "defer",
      original_minutes: estimatedMinutes,
      new_minutes: 0,
      reason:
        task.energy_required === "high"
          ? "Requires high focus and no longer fits well in the remaining time."
          : "Lower fit for the remaining schedule compared with more urgent commitments."
    });
  }

  return {
    actions,
    recovered_minutes: usedMinutes,
    buffer_minutes: Math.max(remainingMinutes - usedMinutes, 0)
  };
}

function buildRecoveredTimeline(actions, currentTime) {
  const keptActions = actions.filter((action) => action.new_minutes > 0);

  let [hour, minute] = (currentTime || "21:00").split(":").map(Number);

  return keptActions.map((action) => {
    const startHour = hour;
    const startMinute = minute;

    minute += Number(action.new_minutes || 0);

    while (minute >= 60) {
      hour += 1;
      minute -= 60;
    }

    const formatTime = (h, m) => {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    return {
      task_id: action.task_id,
      title: action.title,
      action: action.action,
      scheduled_start: formatTime(startHour, startMinute),
      scheduled_end: formatTime(hour, minute),
      minutes: action.new_minutes
    };
  });
}

async function recommendRecovery({ remaining_minutes, current_time, trigger }) {
  const { plan, tasks } = await getCurrentPlan();

  if (!plan) {
    return {
      status: "no_active_plan",
      message: "No active plan found. Create a plan first."
    };
  }

  const pendingTasks = getPendingTasks(tasks);
  const pendingMinutes = pendingTasks.reduce(
    (total, task) => total + Number(task.estimated_minutes || 0),
    0
  );

  const remainingMinutes = Number(remaining_minutes);

  const recoveryResult = createRecoveryActions(pendingTasks, remainingMinutes);
  const recoveredTimeline = buildRecoveredTimeline(
    recoveryResult.actions,
    current_time || "21:00"
  );

  const deferredTasks = recoveryResult.actions.filter(
    (action) => action.action === "defer"
  );

  return {
    status: "recommendation_ready",
    plan_id: plan.plan_id,
    plan_title: plan.title,
    trigger: trigger || "Plan no longer fits available time",
    current_time: current_time || null,
    pending_minutes_before: pendingMinutes,
    remaining_minutes: remainingMinutes,
    recovered_minutes: recoveryResult.recovered_minutes,
    buffer_minutes: recoveryResult.buffer_minutes,
    overload_minutes_before: Math.max(pendingMinutes - remainingMinutes, 0),
    actions: recoveryResult.actions,
    recovered_timeline: recoveredTimeline,
    deferred_tasks: deferredTasks,
    approval_required: true,
    message:
      "I created a recovery recommendation. No changes have been applied yet. Please approve before I update the plan."
  };
}

async function applyRecoveryPlan({
  plan_id,
  trigger,
  actions,
  approved_by_user
}) {
  if (!approved_by_user) {
    return {
      status: "approval_required",
      message: "Recovery plan was not applied because user approval is required."
    };
  }

  if (!plan_id) {
    throw new Error("plan_id is required");
  }

  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error("actions array is required");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  let updatedTasksCount = 0;

  for (const action of actions) {
    const update = {
      rescue_action: action.action,
      updated_at: now
    };

    if (action.action === "keep") {
      update.status = "pending";

      if (action.scheduled_start) {
        update.scheduled_start = action.scheduled_start;
      }

      if (action.scheduled_end) {
        update.scheduled_end = action.scheduled_end;
      }
    }

    if (action.action === "shorten" || action.action === "convert") {
      update.status = "pending";
      update.estimated_minutes = action.new_minutes;

      if (action.scheduled_start) {
        update.scheduled_start = action.scheduled_start;
      }

      if (action.scheduled_end) {
        update.scheduled_end = action.scheduled_end;
      }
    }

    if (action.action === "defer") {
      update.status = "deferred";
      update.deferred_to = action.new_date || "tomorrow";
      update.defer_reason = action.reason || "Deferred during plan rescue";
    }

    const result = await db.collection("tasks").updateOne(
      {
        task_id: action.task_id,
        plan_id
      },
      {
        $set: update,
        ...(action.action === "defer" ? { $inc: { defer_count: 1 } } : {})
      }
    );

    updatedTasksCount += result.modifiedCount;
  }

  const recoveryEvent = {
    event_id: `recovery_${randomUUID()}`,
    plan_id,
    user_id: "demo_user",
    trigger: trigger || "Recovery plan approved by user",
    actions,
    approved_by_user: true,
    updated_tasks_count: updatedTasksCount,
    created_at: now
  };

  await db.collection("recovery_events").insertOne(recoveryEvent);

  await db.collection("plans").updateOne(
    {
      plan_id
    },
    {
      $set: {
        status: "recovered",
        updated_at: now,
        last_recovery_event_id: recoveryEvent.event_id
      }
    }
  );

  const updatedPlan = await getCurrentPlan();

  return {
    status: "recovery_applied",
    message: "Recovery plan applied successfully.",
    updated_tasks_count: updatedTasksCount,
    recovery_event: recoveryEvent,
    current_plan: updatedPlan.plan,
    current_tasks: updatedPlan.tasks
  };
}

module.exports = {
  recommendRecovery,
  applyRecoveryPlan
};