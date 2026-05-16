import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function App() {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [realityCheck, setRealityCheck] = useState(null);
  const [recoveryRecommendation, setRecoveryRecommendation] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [commitmentResult, setCommitmentResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function createDemoPlan() {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/plans/demo`);
      setCurrentPlan(response.data.plan);
      setTasks(response.data.tasks);
      setRealityCheck(null);
      setRecoveryRecommendation(null);
      setApplyResult(null);
      setCommitmentResult(null);
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrentPlan() {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/plans/current`);
      setCurrentPlan(response.data.plan);
      setTasks(response.data.tasks || []);
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function runRealityCheck() {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/reality-check`, {
        remaining_minutes: 90,
        current_time: "21:00"
      });
      setRealityCheck(response.data);
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function recommendRecovery() {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/recovery/recommend`, {
        remaining_minutes: 90,
        current_time: "21:00",
        trigger: "It is already 9 PM and meeting notes are urgent. Rescue my day."
      });
      setRecoveryRecommendation(response.data);
      setApplyResult(null);
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function applyRecovery() {
    if (!recoveryRecommendation) {
      alert("Generate a recovery recommendation first.");
      return;
    }

    setLoading(true);
    try {
      const actionsWithSchedule = recoveryRecommendation.actions.map((action) => {
        const timelineItem = recoveryRecommendation.recovered_timeline.find(
          (item) => item.task_id === action.task_id
        );

        return {
          ...action,
          scheduled_start: timelineItem?.scheduled_start,
          scheduled_end: timelineItem?.scheduled_end,
          new_date: action.action === "defer" ? "tomorrow" : undefined
        };
      });

      const response = await axios.post(`${API_BASE_URL}/api/recovery/apply`, {
        plan_id: recoveryRecommendation.plan_id,
        trigger: recoveryRecommendation.trigger,
        approved_by_user: true,
        actions: actionsWithSchedule
      });

      setApplyResult(response.data);
      await fetchCurrentPlan();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function simulateCommitment() {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/commitments/simulate`, {
        title: "Review teammate document",
        estimated_minutes: 45,
        priority: "medium",
        deadline: "tonight"
      });
      setCommitmentResult(response.data);
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">PlanRescue AI</p>
          <h1>Recover your day when plans break.</h1>
          <p>
            An adaptive productivity agent that checks your schedule, recommends a rescue plan,
            applies approved updates, and prevents overcommitment.
          </p>
        </div>
        <div className="hero-actions">
          <button onClick={createDemoPlan} disabled={loading}>Create Demo Plan</button>
          <button onClick={fetchCurrentPlan} disabled={loading}>Refresh Plan</button>
        </div>
      </section>

      <section className="dashboard">
        <div className="panel">
          <h2>Current Plan</h2>
          {currentPlan ? (
            <>
              <p><strong>{currentPlan.title}</strong></p>
              <p>
                Status: <span className={`badge ${currentPlan.status}`}>{currentPlan.status}</span>
              </p>
              <p>Available minutes: {currentPlan.available_minutes}</p>
            </>
          ) : (
            <p>No plan loaded yet. Create a demo plan to begin.</p>
          )}

          <div className="task-list">
            {tasks.map((task) => (
              <div key={task.task_id} className={`task-card ${task.status}`}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.scheduled_start}–{task.scheduled_end}</p>
                </div>
                <div className="task-meta">
                  <span className={`badge ${task.status}`}>{task.status}</span>
                  {task.rescue_action && (
                    <span className="badge secondary">{task.rescue_action}</span>
                  )}
                  <p>{task.estimated_minutes} min</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Agent Actions</h2>
          <button onClick={runRealityCheck} disabled={loading}>Run Reality Check</button>
          <button onClick={recommendRecovery} disabled={loading}>Recommend Recovery</button>
          <button onClick={applyRecovery} disabled={loading || !recoveryRecommendation}>
            Approve & Apply Recovery
          </button>
          <button onClick={simulateCommitment} disabled={loading}>Simulate New Commitment</button>

          {loading && <p className="loading">Working...</p>}

          <div className="demo-hint">
            <strong>Demo flow:</strong>
            <ol>
              <li>Create demo plan</li>
              <li>Run reality check</li>
              <li>Recommend recovery</li>
              <li>Approve recovery</li>
              <li>Simulate new commitment</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="results-grid">
        <RealityCheckSummary data={realityCheck} />
        <RecoverySummary data={recoveryRecommendation} />
        <ApplyResultSummary data={applyResult} />
        <CommitmentSummary data={commitmentResult} />
      </section>
    </main>
  );
}

function RealityCheckSummary({ data }) {
  return (
    <div className="panel result-card">
      <h2>Reality Check</h2>
      {!data ? (
        <p>No result yet.</p>
      ) : (
        <>
          <StatusBanner
            type={data.status === "overloaded" ? "danger" : "success"}
            title={formatStatus(data.status)}
            message={data.recommendation}
          />

          <div className="metric-grid">
            <Metric label="Pending work" value={`${data.pending_minutes} min`} />
            <Metric label="Remaining time" value={`${data.remaining_minutes} min`} />
            <Metric label="Overload" value={`${data.overload_minutes} min`} />
          </div>

          {data.at_risk_tasks?.length > 0 && (
            <>
              <h3>At-risk tasks</h3>
              <ul className="clean-list">
                {data.at_risk_tasks.map((task) => (
                  <li key={task.task_id}>
                    <strong>{task.title}</strong>
                    <span>{task.estimated_minutes} min · {task.priority} priority</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <JsonDetails data={data} />
        </>
      )}
    </div>
  );
}

function RecoverySummary({ data }) {
  return (
    <div className="panel result-card">
      <h2>Recovery Recommendation</h2>
      {!data ? (
        <p>No result yet.</p>
      ) : (
        <>
          <StatusBanner
            type="warning"
            title="Recovery recommendation ready"
            message="No changes have been applied yet. User approval is required."
          />

          <div className="metric-grid">
            <Metric label="Before" value={`${data.pending_minutes_before} min`} />
            <Metric label="Remaining" value={`${data.remaining_minutes} min`} />
            <Metric label="Recovered plan" value={`${data.recovered_minutes} min`} />
            <Metric label="Buffer" value={`${data.buffer_minutes} min`} />
          </div>

          <h3>Recommended actions</h3>
          <div className="action-list">
            {data.actions?.map((action) => (
              <div key={action.task_id} className={`action-row ${action.action}`}>
                <span className="action-icon">{getActionIcon(action.action)}</span>
                <div>
                  <strong>{formatStatus(action.action)} — {action.title}</strong>
                  <p>
                    {action.action === "shorten"
                      ? `${action.original_minutes} → ${action.new_minutes} min`
                      : `${action.new_minutes} min`}
                  </p>
                  <small>{action.reason}</small>
                </div>
              </div>
            ))}
          </div>

          {data.recovered_timeline?.length > 0 && (
            <>
              <h3>Recovered timeline</h3>
              <ul className="clean-list">
                {data.recovered_timeline.map((item) => (
                  <li key={item.task_id}>
                    <strong>{item.scheduled_start}–{item.scheduled_end}</strong>
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <JsonDetails data={data} />
        </>
      )}
    </div>
  );
}

function ApplyResultSummary({ data }) {
  return (
    <div className="panel result-card">
      <h2>Apply Result</h2>
      {!data ? (
        <p>No result yet.</p>
      ) : (
        <>
          <StatusBanner
            type="success"
            title="Recovery applied successfully"
            message="MongoDB tasks were updated and a recovery event was stored."
          />

          <div className="metric-grid">
            <Metric label="Updated tasks" value={data.updated_tasks_count} />
            <Metric label="Event stored" value="Yes" />
          </div>

          {data.recovery_event && (
            <p className="event-id">
              Recovery event: <code>{data.recovery_event.event_id}</code>
            </p>
          )}

          <JsonDetails data={data} />
        </>
      )}
    </div>
  );
}

function CommitmentSummary({ data }) {
  return (
    <div className="panel result-card">
      <h2>Commitment Simulation</h2>
      {!data ? (
        <p>No result yet.</p>
      ) : (
        <>
          <StatusBanner
            type={data.can_fit ? "success" : "danger"}
            title={data.can_fit ? "Commitment can fit" : "Overcommitment detected"}
            message={data.message}
          />

          <div className="metric-grid">
            <Metric label="Current plan" value={`${data.current_pending_minutes} min`} />
            <Metric label="New commitment" value={`${data.new_commitment?.estimated_minutes} min`} />
            <Metric label="Total after adding" value={`${data.total_minutes_after_adding} min`} />
            <Metric label="Overload" value={`${data.overload_minutes} min`} />
          </div>

          {data.recommended_options?.length > 0 && (
            <>
              <h3>Recommended options</h3>
              <ul className="clean-list">
                {data.recommended_options.map((option, index) => (
                  <li key={index}>
                    <strong>Option {index + 1}</strong>
                    <span>{option}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <JsonDetails data={data} />
        </>
      )}
    </div>
  );
}

function StatusBanner({ type, title, message }) {
  return (
    <div className={`status-banner ${type}`}>
      <strong>{title}</strong>
      {message && <p>{message}</p>}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function JsonDetails({ data }) {
  return (
    <details className="json-details">
      <summary>Show technical JSON</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

function getActionIcon(action) {
  if (action === "keep") return "✅";
  if (action === "shorten") return "✂️";
  if (action === "convert") return "🔁";
  if (action === "defer") return "⏭️";
  return "•";
}

function formatStatus(value) {
  if (!value) return "";
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default App;