const { randomUUID } = require("crypto");
const { getDb } = require("./mongoService");

function getCurrentDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

async function createDemoPlan() {
  const db = await getDb();

  const now = getCurrentTimestamp();
  const today = getCurrentDateString();

  const planId = `plan_${randomUUID()}`;

  const plan = {
    plan_id: planId,
    user_id: "demo_user",
    date: today,
    title: "Evening Plan Rescue Demo",
    start_time: "19:00",
    end_time: "23:00",
    available_minutes: 240,
    status: "active",
    summary:
      "Evening plan for hackathon work, learning, office preparation, personal admin, and health.",
    created_at: now,
    updated_at: now
  };

  const tasks = [
    {
      task_id: `task_${randomUUID()}`,
      plan_id: planId,
      user_id: "demo_user",
      title: "Learn MongoDB MCP basics",
      category: "learning",
      estimated_minutes: 40,
      actual_minutes: null,
      priority: "medium",
      deadline: `${today}T23:00:00`,
      status: "pending",
      flexibility: "medium",
      energy_required: "medium",
      scheduled_start: "19:00",
      scheduled_end: "19:40",
      rescue_action: null,
      defer_count: 0,
      created_at: now,
      updated_at: now
    },
    {
      task_id: `task_${randomUUID()}`,
      plan_id: planId,
      user_id: "demo_user",
      title: "Build hackathon prototype architecture",
      category: "hackathon",
      estimated_minutes: 70,
      actual_minutes: null,
      priority: "high",
      deadline: `${today}T23:00:00`,
      status: "pending",
      flexibility: "medium",
      energy_required: "high",
      scheduled_start: "19:40",
      scheduled_end: "20:50",
      rescue_action: null,
      defer_count: 0,
      created_at: now,
      updated_at: now
    },
    {
      task_id: `task_${randomUUID()}`,
      plan_id: planId,
      user_id: "demo_user",
      title: "Prepare tomorrow's meeting notes",
      category: "work",
      estimated_minutes: 40,
      actual_minutes: null,
      priority: "high",
      deadline: `${today}T23:00:00`,
      status: "pending",
      flexibility: "low",
      energy_required: "medium",
      scheduled_start: "20:50",
      scheduled_end: "21:30",
      rescue_action: null,
      defer_count: 0,
      created_at: now,
      updated_at: now
    },
    {
      task_id: `task_${randomUUID()}`,
      plan_id: planId,
      user_id: "demo_user",
      title: "Pay internet bill",
      category: "personal_admin",
      estimated_minutes: 10,
      actual_minutes: null,
      priority: "high",
      deadline: `${today}T23:00:00`,
      status: "pending",
      flexibility: "low",
      energy_required: "low",
      scheduled_start: "21:30",
      scheduled_end: "21:40",
      rescue_action: null,
      defer_count: 0,
      created_at: now,
      updated_at: now
    },
    {
      task_id: `task_${randomUUID()}`,
      plan_id: planId,
      user_id: "demo_user",
      title: "Exercise",
      category: "health",
      estimated_minutes: 30,
      actual_minutes: null,
      priority: "medium",
      deadline: `${today}T23:00:00`,
      status: "pending",
      flexibility: "high",
      energy_required: "medium",
      scheduled_start: "21:40",
      scheduled_end: "22:10",
      rescue_action: null,
      defer_count: 0,
      created_at: now,
      updated_at: now
    }
  ];

  await db.collection("plans").insertOne(plan);
  await db.collection("tasks").insertMany(tasks);

  return {
    plan,
    tasks
  };
}

async function getCurrentPlan() {
  const db = await getDb();

  const plan = await db.collection("plans").findOne(
    {
      user_id: "demo_user",
      status: "active"
    },
    {
      sort: {
        created_at: -1
      }
    }
  );

  if (!plan) {
    return {
      plan: null,
      tasks: []
    };
  }

  const tasks = await db
    .collection("tasks")
    .find({
      plan_id: plan.plan_id
    })
    .sort({
      scheduled_start: 1
    })
    .toArray();

  return {
    plan,
    tasks
  };
}

module.exports = {
  createDemoPlan,
  getCurrentPlan
};