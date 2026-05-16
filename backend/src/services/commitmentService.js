const { randomUUID } = require("crypto");
const { getDb } = require("./mongoService");
const { getCurrentPlan } = require("./planService");

function getPendingTasks(tasks) {
  return tasks.filter((task) => task.status === "pending");
}

function calculatePendingMinutes(tasks) {
  return tasks.reduce((total, task) => {
    return total + Number(task.estimated_minutes || 0);
  }, 0);
}

function buildRecommendedOptions({
  canFit,
  overloadMinutes,
  title,
  estimatedMinutes,
  currentPendingTasks
}) {
  if (canFit) {
    return [
      `Add "${title}" as planned because it fits within the current schedule.`,
      "Keep a small buffer in case existing tasks take longer than expected."
    ];
  }

  const options = [];

  if (estimatedMinutes > 20) {
    options.push(
      `Limit "${title}" to a 20-minute version instead of ${estimatedMinutes} minutes.`
    );
  }

  const flexibleTask = currentPendingTasks.find(
    (task) => task.flexibility === "high" || task.priority !== "high"
  );

  if (flexibleTask) {
    options.push(
      `Defer or shorten "${flexibleTask.title}" to make room for the new commitment.`
    );
  }

  options.push(
    `Move "${title}" to tomorrow because adding it now overloads the plan by ${overloadMinutes} minutes.`
  );

  options.push(
    "Decline or renegotiate the commitment if existing high-priority tasks must be protected."
  );

  return options;
}

async function simulateNewCommitment({
  title,
  estimated_minutes,
  priority,
  deadline
}) {
  if (!title) {
    throw new Error("title is required");
  }

  if (!estimated_minutes) {
    throw new Error("estimated_minutes is required");
  }

  const db = await getDb();
  const { plan, tasks } = await getCurrentPlan();

  if (!plan) {
    return {
      status: "no_active_plan",
      message: "No current plan found. Create a plan before simulating commitments."
    };
  }

  const pendingTasks = getPendingTasks(tasks);
  const currentPendingMinutes = calculatePendingMinutes(pendingTasks);
  const newCommitmentMinutes = Number(estimated_minutes);

  // For current demo logic:
  // If the plan is recovered, use remaining recovered active schedule as available capacity.
  // If the plan is active, use original available_minutes.
  const availableMinutes =
    plan.status === "recovered"
      ? currentPendingMinutes
      : Number(plan.available_minutes || 0);

  const totalAfterAdding = currentPendingMinutes + newCommitmentMinutes;
  const overloadMinutes = Math.max(totalAfterAdding - availableMinutes, 0);
  const canFit = overloadMinutes === 0;

  const recommendedOptions = buildRecommendedOptions({
    canFit,
    overloadMinutes,
    title,
    estimatedMinutes: newCommitmentMinutes,
    currentPendingTasks: pendingTasks
  });

  const now = new Date().toISOString();

  const simulation = {
    simulation_id: `simulation_${randomUUID()}`,
    user_id: "demo_user",
    plan_id: plan.plan_id,
    plan_status: plan.status,
    new_commitment: {
      title,
      estimated_minutes: newCommitmentMinutes,
      priority: priority || "medium",
      deadline: deadline || "unspecified"
    },
    current_pending_minutes: currentPendingMinutes,
    available_minutes: availableMinutes,
    total_minutes_after_adding: totalAfterAdding,
    overload_minutes: overloadMinutes,
    can_fit: canFit,
    recommended_options: recommendedOptions,
    created_at: now
  };

  await db.collection("commitment_simulations").insertOne(simulation);

  return {
    status: canFit ? "commitment_can_fit" : "overcommitment_detected",
    can_fit: canFit,
    simulation_id: simulation.simulation_id,
    plan_id: plan.plan_id,
    plan_status: plan.status,
    new_commitment: simulation.new_commitment,
    current_pending_minutes: currentPendingMinutes,
    available_minutes: availableMinutes,
    total_minutes_after_adding: totalAfterAdding,
    overload_minutes: overloadMinutes,
    recommended_options: recommendedOptions,
    message: canFit
      ? "The new commitment fits into the current plan."
      : "Adding this commitment would overload the current plan. Review the recommended options before accepting it."
  };
}

module.exports = {
  simulateNewCommitment
};