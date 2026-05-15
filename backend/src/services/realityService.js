const { getCurrentPlan } = require("./planService");

function getPendingTasks(tasks) {
  return tasks.filter((task) => task.status === "pending");
}

function calculatePendingMinutes(tasks) {
  return tasks.reduce((total, task) => {
    return total + Number(task.estimated_minutes || 0);
  }, 0);
}

function getTaskRiskScore(task) {
  let score = 0;

  if (task.priority === "high") score += 3;
  if (task.priority === "medium") score += 2;
  if (task.priority === "low") score += 1;

  if (task.flexibility === "low") score += 3;
  if (task.flexibility === "medium") score += 2;
  if (task.flexibility === "high") score += 1;

  if (task.energy_required === "high") score += 2;
  if (task.estimated_minutes >= 60) score += 2;
  if (task.estimated_minutes >= 30 && task.estimated_minutes < 60) score += 1;

  return score;
}

function identifyAtRiskTasks(tasks, remainingMinutes) {
  const pendingTasks = getPendingTasks(tasks);

  let runningTotal = 0;

  return pendingTasks
    .map((task) => {
      runningTotal += Number(task.estimated_minutes || 0);

      return {
        task_id: task.task_id,
        title: task.title,
        priority: task.priority,
        estimated_minutes: task.estimated_minutes,
        flexibility: task.flexibility,
        energy_required: task.energy_required,
        risk_score: getTaskRiskScore(task),
        risk_reason:
          runningTotal > remainingMinutes
            ? "This task may not fit in the remaining time."
            : "This task currently fits, but may still be affected by schedule changes."
      };
    })
    .filter((task) => {
      return (
        task.risk_reason.includes("may not fit") ||
        task.estimated_minutes > remainingMinutes ||
        task.energy_required === "high"
      );
    })
    .sort((a, b) => b.risk_score - a.risk_score);
}

async function runRealityCheck({ remaining_minutes, current_time }) {
  const { plan, tasks } = await getCurrentPlan();

  if (!plan) {
    return {
      status: "no_active_plan",
      message: "No active plan found for demo_user.",
      plan: null,
      tasks: []
    };
  }

  const pendingTasks = getPendingTasks(tasks);
  const pendingMinutes = calculatePendingMinutes(pendingTasks);
  const remainingMinutes = Number(remaining_minutes);

  const overloadMinutes = Math.max(pendingMinutes - remainingMinutes, 0);

  let status = "realistic";

  if (overloadMinutes > 0) {
    status = "overloaded";
  } else if (remainingMinutes - pendingMinutes <= 30) {
    status = "tight";
  }

  const atRiskTasks = identifyAtRiskTasks(pendingTasks, remainingMinutes);

  return {
    status,
    current_time,
    plan_id: plan.plan_id,
    plan_title: plan.title,
    pending_task_count: pendingTasks.length,
    pending_minutes: pendingMinutes,
    remaining_minutes: remainingMinutes,
    overload_minutes: overloadMinutes,
    at_risk_tasks: atRiskTasks,
    recommendation:
      status === "overloaded"
        ? "Your plan no longer fits the remaining time. A recovery plan is recommended."
        : status === "tight"
          ? "Your plan fits, but there is very little buffer. Consider shortening flexible tasks."
          : "Your plan is currently realistic."
  };
}

module.exports = {
  runRealityCheck
};