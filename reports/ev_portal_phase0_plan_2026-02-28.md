# EV Portal Phase 0 Plan (TASK-0017)

Date: 2026-02-28
Owner: Astra (agent:main)
Scope: Plan-first architecture and timeout-safe execution split for enterprise EV charging portal.

## 1) Recommended Production Stack (current, stable)

- **Frontend (portal):** React 18 + TypeScript + Vite + TanStack Query + React Router
- **UI system:** Tailwind CSS + shadcn/ui (fast component velocity, accessible defaults)
- **Auth/Identity:** Clerk or Auth0 with OIDC/SAML support (Google + Apple), session token hardening, org/role claims
- **Backend API:** Fastify + TypeScript
- **Database:** PostgreSQL + Prisma
- **Queue/async:** BullMQ + Redis (for charger events, reconciliation, reports)
- **Realtime:** WebSocket/SSE gateway for live charger/session telemetry
- **Observability:** OpenTelemetry + structured logs + Sentry
- **Infra:** Railway (API/OCPP/db) + Vercel (portal) in near-term; migration-ready to k8s later

## 2) Architecture Boundaries

1. **Identity boundary**
   - External IdP handles user auth (Google/Apple), app handles authorization (RBAC + org scope).
2. **Domain boundary**
   - OCPP ingest/charger control isolated from portal read/write API.
3. **Permission boundary**
   - API enforces permission checks server-side for every mutating/read-sensitive route.
4. **Tenant boundary**
   - Organization-scoped data model; no cross-org access paths.
5. **Audit boundary**
   - Immutable audit events for role changes, session controls, refunds, charger config changes.

## 3) Persona-by-Persona Core Workflows

### Owner/Operator
- Manage orgs/sites/chargers/tariffs/users
- View revenue, utilization, uptime, incidents
- Approve policy/config changes

### Customer Service
- Search sessions/users/transactions
- Handle failed starts, refunds, support notes
- Issue controlled remediation actions

### Network Reliability Engineer
- Monitor charger heartbeat/offline faults
- Diagnose connector failures, firmware drifts
- Trigger safe remote actions with guardrails

### Data Analyst
- Build/download KPI views (utilization, margin, failure rate)
- Compare cohorts by site/model/firmware
- Access read-only datasets and scheduled reports

## 4) Timeout-Safe Split Policy (critical)

## Split when any of these are true
- Estimated runtime > 8 minutes
- Requires >1 external service integration in one run
- Requires both schema migration + UI + API in same run
- Requires test matrix > 10 cases across roles

## Run-time budgets
- Target per worker run: **4–7 minutes**
- Hard cap per run: **<= 12 minutes**
- Always produce checkpoint artifact + task comment before exit

## Standard split dimensions
- **Vertical slice split:** auth / RBAC / workspace nav / analytics
- **Layer split:** schema + API first, then frontend
- **Risk split:** high-risk security pieces isolated from UI polish

## 5) Phased Backlog with Acceptance Criteria + ETA

## Phase 1 — Auth Foundation (TASK-0018)

Deliverables:
- Login page and session lifecycle
- Google SSO working end-to-end
- Apple SSO integration path configured (provider wiring + callback contract)
- Role bootstrap on first login (default least privilege)

Acceptance criteria:
- User can sign in via Google in production-like env
- Apple auth path validated via callback test and claim mapping
- Session refresh + logout works
- Unauthorized routes redirect to login
- Audit event recorded on login/logout

Estimated worker runtime:
- 2 runs (frontend auth shell, backend claim/bootstrap) @ 5–7 min each

## Phase 2 — Enterprise RBAC + Persona Blueprint (TASK-0019)

Deliverables:
- Stackable role model and permission matrix
- API permission middleware + policy tests
- Persona workspace navigation map
- Initial contracts for owner/cs/sre/analyst endpoints

Acceptance criteria:
- Permission matrix documented and implemented for critical endpoints
- Role escalation blocked by policy
- Navigation renders per persona with no unauthorized tabs
- API contract doc published for each persona lane

Estimated worker runtime:
- 2–3 runs @ 5–8 min each (schema/policies, API enforcement, nav/contracts)

## Phase 3 — Roll-up validation (TASK-0016 close condition)

Deliverables:
- Summary linking TASK-0017/0018/0019 artifacts
- Validation checklist pass/fail with gaps
- Explicit go/no-go for next build phase

Acceptance criteria:
- All dependency tasks marked done
- Deliverable links present and accessible
- Remaining risks documented with owners

Estimated worker runtime:
- 1 run @ 3–5 min

## 6) Immediate Handoff Actions Completed

- TASK-0017 -> set to `done`, `automate=no`
- TASK-0018 -> set to `todo`, `automate=yes`
- TASK-0018 comment appended: dependency satisfied by TASK-0017

## 7) Next Recommended Execution Order

1. Execute TASK-0018 (auth foundation) in 2 bounded runs if needed
2. Upon completion, unblock TASK-0019 and set automate=yes
3. Close TASK-0016 only after TASK-0019 validation summary is logged
