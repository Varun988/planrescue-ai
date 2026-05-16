# PlanRescue AI

**PlanRescue AI** is an adaptive productivity recovery agent that helps users rescue their day when their original plan no longer fits reality.

Most productivity tools help users create plans. PlanRescue AI focuses on what happens after the plan breaks: missed time blocks, urgent new work, overloaded evenings, and commitments that no longer fit.

The system can create a plan, detect overload, recommend a recovery strategy, apply approved changes, and simulate whether a new commitment will break the current schedule.

---

## Problem

People often create plans that look reasonable at the start of the day, but real life changes quickly:

- Work takes longer than expected
- Urgent tasks appear
- Personal commitments shift
- Energy and available time decrease
- Important tasks compete with flexible tasks
- Users accept new commitments without checking capacity

Traditional task apps usually show overdue tasks, but they do not actively help users recover.

---

## Solution

PlanRescue AI acts as a personal productivity recovery agent.

It can:

1. Create a structured daily plan from a demo scenario
2. Store plans and tasks in MongoDB
3. Run a reality check against remaining time
4. Detect overloaded plans
5. Recommend recovery actions:
   - keep
   - shorten
   - defer
   - convert
6. Apply recovery changes only after user approval
7. Store recovery events in MongoDB
8. Simulate the impact of new commitments before the user accepts them

---

## Key Features

### 1. Plan Creation

Creates a demo evening plan with tasks such as:

- Learn MongoDB MCP basics
- Build hackathon prototype architecture
- Prepare meeting notes
- Pay internet bill
- Exercise

### 2. Reality Check

Compares pending work with remaining time.

Example:

```text
Pending work: 190 minutes
Remaining time: 90 minutes
Overload: 100 minutes