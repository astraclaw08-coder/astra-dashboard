# Astra Dashboard

Tiny single-page dashboard with a Kanban board plus agent Event View, built with plain HTML/CSS/JS.

## Features

### Kanban Board (top half)
- Add cards with a title
- Drag cards between `Todo`, `Doing`, and `Done`
- Persists automatically with `localStorage`
- `Clear all` button with confirmation prompt

### Event View (bottom half)
- **Scheduled tab** — upcoming agent jobs with countdown timestamps
- **Completed tab** — finished agent runs from the last rolling 7 days
- Tab badges show live event counts
- Event cards show title, status badge, agent ID, and relative timestamp
- Click any event card to open a **detail modal** showing:
  - Why it was scheduled or triggered (reason)
  - What it did / will do (action summary)
  - Scheduled and completed timestamps
  - Agent that owns the event
- Seeds realistic sample events on first load (OpenClaw cron jobs)
- Events persisted in `localStorage` under key `quick-kanban:events:v1`

## Data model

```js
{
  id: string,
  title: string,
  status: "scheduled" | "completed",
  reason: string,
  actionSummary: string,
  scheduledAt: string,     // ISO 8601
  completedAt: string|null,
  agentId: string
}
```

## Run locally

Open `index.html` in a browser.

No build tools or dependencies required.
