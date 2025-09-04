# Custom ERP Implementation Guide — CA Mine (Enterprise‑Grade)
**Version:** 1.0  
**Date:** August 29, 2025  
**Audience:** Engineering, QA, DevOps, Product (NextGen Technology Limited)  
**Purpose:** Single source of truth for coding, testing, deployment, and acceptance aligned with RFQ priorities (P1–P4) and the updated architecture baseline (SSE + Redis, Postgres/Prisma, offline‑first).

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Guiding Principles & ADRs](#guiding-principles--adrs)
3. [Scope & Priorities (RFQ‑aligned) + DoD](#scope--priorities-rfq-aligned--dod)
4. [Target Architecture](#target-architecture)
   - [Frontend](#frontend)
   - [API Layer](#api-layer)
   - [Database](#database)
   - [Realtime (SSE + Redis)](#realtime-sse--redis)
   - [Hybrid/Offline Patterns](#hybridoffline-patterns)
   - [Observability](#observability)
   - [CI/CD](#cicd)
5. [Domain Data Model (Prisma)](#domain-data-model-prisma)
6. [API Contracts & Folder Structure](#api-contracts--folder-structure)
7. [Eventing Model: Redis Streams + SSE](#eventing-model-redis-streams--sse)
8. [Workflow Engine (Lite → Advanced)](#workflow-engine-lite--advanced)
9. [WBS → Product Backlog Mapping](#wbs--product-backlog-mapping)
10. [Acceptance Criteria & Test Strategy](#acceptance-criteria--test-strategy)
11. [Security & Compliance](#security--compliance)
12. [Environments & Configuration Matrix](#environments--configuration-matrix)
13. [Scaling Gates & Capacity Planning](#scaling-gates--capacity-planning)
14. [Data Migration, Seeding & Cutover](#data-migration-seeding--cutover)
15. [Risk Register (Top 10)](#risk-register-top-10)
16. [Hybrid Online/Offline Playbook](#hybrid-onlineoffline-playbook)
17. [Appendices](#appendices)

---

## Executive Summary
This guide operationalizes the RFQ scope into phased delivery across **Priority 1–4**:
- **P1**: Core platform, offline backbone, Operations, Inventory, operational dashboards & KPIs.  
- **P2**: Finance (GL/AP/AR/FA), advanced procurement (reorder, PO approvals), financial reporting.  
- **P3**: HRMS, Payroll bridge (export/import incl. NCSL, reconciliation), Advanced Maintenance (WO, preventive, parts).  
- **P4**: CRM + BI (ad‑hoc builder, scheduled emails), system optimization.

Architecture baseline emphasizes **portability** and **reliability**: **Next.js + TypeScript**, **tRPC/REST**, **Prisma + Postgres**, **Redis** (Pub/Sub, Streams), **SSE** for realtime, and **offline‑first** UX. We progressively enable **multi‑company/multi‑currency**, **predictive analytics**, and **GraphQL** only when justified.

---

## Guiding Principles & ADRs
- **Simplicity first**: modular monolith (domain‑oriented) that can evolve.  
- **Source of truth**: Postgres. Redis only for transient delivery (fan‑out/replay).  
- **Resilience**: offline capture with idempotent replay; server‑authoritative merge.  
- **Security by default**: SSO/IdP, RBAC, audit append‑only.  
- **Observability**: metrics, logs, traces with SLOs & actionable alerts.

**Architecture Decision Records (ADRs)**
- **ADR‑001**: Keep **SSE + Redis**; add WebSockets only with concrete need.  
- **ADR‑002**: Keep **tRPC/REST** now; consider **GraphQL** later for BI/federation.  
- **ADR‑003**: Adopt **Address Book** (unified party model) & **COA dimensions** incrementally.  
- **ADR‑004**: Gate **multi‑company/currency** behind P3 readiness & reporting coverage.

---

## Scope & Priorities (RFQ‑aligned) + DoD

### Priority 1 — Core Ops & Reporting
**Scope**
- Core platform: SSO/RBAC, audit, notifications, global search, configuration, responsive shell.
- Hybrid backbone: offline cache (lookups), capture‑and‑forward queue, idempotent retries, SSE reconnect/backfill.
- Operations: equipment master; usage hours, load per shift, breakdown capture; rental hours.
- Inventory core: item master, multi‑store stock, GRN/GI; basic PR→PO.
- Dashboards & KPI: MA/PA, Shutdown counts/hours, **MTTR**, **MTBS**, **Availability%**; usage/load & breakdown lists.

**Definition of Done (DoD)**
- RBAC + audit enabled; offline forms replay without duplicates (idempotency keys).  
- SSE live dashboards with reconnect/backfill; KPI pack validated on sample scenarios.  
- GRN/GI and PR→PO basic happy‑path working end‑to‑end.

### Priority 2 — Finance Foundations & Integrated Procurement
**Scope**
- GL (COA, journals, trial balance, period controls).  
- AP (3‑way match PO–GRN–Invoice), payment processing.  
- AR (rental invoice from Ops), cash application.  
- Fixed Assets (register, basic depreciation).  
- Advanced procurement: reorder point & alerts, PO approval workflow, vendor management.  
- Reporting: P&L, BS, Cash Flow, AR/AP Aging, Budget vs Actual.

**DoD**
- 3‑way match enforced (negative/edge tests covered).  
- Period close & locking; scheduled financial reports.  
- Depreciation postings to GL; audit trail complete.

### Priority 3 — HR, Payroll Bridge & Advanced Maintenance
**Scope**
- HRMS: employee master, org structure, leave (ESS+approval+accrual), attendance & timesheet (incl. 12‑hour), R&R tracking.  
- Payroll bridge: exports/imports (incl. NCSL), reconciliation vs telematics.  
- Advanced maintenance: WO lifecycle, preventive scheduling (hours/date), parts consumption linked to Inventory.

**DoD**
- Payroll reconciliation report highlights variances; WO end‑to‑end including parts and costs.

### Priority 4 — CRM & BI
**Scope**
- CRM: rental SO, service tickets, interaction logs.  
- BI: role‑based dashboards, ad‑hoc builder, scheduled email reports.

**DoD**
- SO→AR flow; ad‑hoc builder available; report scheduling active.

---

## Target Architecture

### Frontend
- **Next.js (App Router), TypeScript, Tailwind, shadcn/ui, React Query**  
- **PWA**: offline cache (IndexedDB), background sync for queued actions.  
- Folder hint:
```
apps/web/
  app/(routes)/
  components/
  lib/ (utils, api client)
  features/
    core/ (auth, rbac, audit, notifications)
    ops/  (equipment, usage, breakdown)
    inv/  (items, grn, gi, pr-po)
    fin/  (gl, ap, ar, fa, reports)
    hr/   (employee, leave, timesheet, rr)
    mnt/  (work-orders, schedules)
    crm/  (so, tickets)
    bi/   (builder, dashboards)
```

### API Layer
- **Next.js Route Handlers** or small Node service; **tRPC** or REST.  
- Validation at boundaries (Zod).  
- Idempotent mutations (`Idempotency-Key` header) with server‑side de‑duplication.

### Database
- **Postgres** (Neon → AWS RDS/Aurora), **Prisma ORM** with versioned migrations.  
- Partitioning/Indexing for high‑volume tables (usage logs, events, gl entries).

### Realtime (SSE + Redis)
- **SSE** to browsers/devices.  
- **Redis Pub/Sub** for low‑latency fan‑out; **Redis Streams** for replay and consumer groups.  
- Monotonic cursor per client; backfill on reconnect.

### Hybrid/Offline Patterns
1. **Read‑only cache** for lookups (master data).  
2. **Capture‑and‑Forward** for forms (queue in IndexedDB → replay with idempotency).  
3. **Offline Packs** (selected flows) using IndexedDB/RxDB or SQLite wrapper; server‑authoritative merge using `base_version` and hashes (CRDT only for free‑text notes if needed).

### Observability
- **Sentry** for errors, **OpenTelemetry** for traces/metrics/logs; **Grafana/Loki/Tempo** in Stage 3.  
- SLOs: p95 API ≤ 300 ms @ 100 req/s; worker job p95 ≤ 30 s.

### CI/CD
- **GitHub Actions** (lint, typecheck, test, build, deploy), environment‑based promotions; smoke & canary checks; auto‑rollback policy.

---

## Domain Data Model (Prisma)
> Minimal set to start P1/P2 and extend later (JDE‑style alignment).

```prisma
// --------------- Core & Security ---------------
model User {
  id           String  @id @default(cuid())
  email        String  @unique
  name         String?
  tenantId     String
  roles        UserRole[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Role { id String @id @default(cuid()) name String @unique }
model Permission { id String @id @default(cuid()) code String @unique }

model UserRole {
  id       String @id @default(cuid())
  userId   String
  roleId   String
  user     User   @relation(fields: [userId], references: [id])
  role     Role   @relation(fields: [roleId], references: [id])
}

// Append‑only audit
model AuditEvent {
  id          String   @id @default(cuid())
  tenantId    String
  actorId     String?
  entity      String
  entityId    String
  action      String   // created|updated|deleted|approved|posted|...
  changes     Json?
  createdAt   DateTime @default(now())
  hash        String   // tamper-evidence
}

// --------------- Address Book (JDE F0101‑style) ---------------
model AddressBook {
  id          String   @id @default(cuid())
  tenantId    String
  alphaName   String
  isCustomer  Boolean  @default(false)
  isVendor    Boolean  @default(false)
  isEmployee  Boolean  @default(false)
  altKey      String?  // alternate address key
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// --------------- Inventory (F4101/F4102/F41021/F4111) ---------------
model Item {
  id           String   @id @default(cuid())
  tenantId     String
  number       String   @unique
  description  String
  type         String
  stdCost      Decimal  @default(0)
  lastCost     Decimal  @default(0)
  avgCost      Decimal  @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  branches     ItemBranch[]
}

model ItemBranch {
  id           String   @id @default(cuid())
  itemId       String
  siteId       String
  reorderPoint Int      @default(0)
  reorderQty   Int      @default(0)
  safetyStock  Int      @default(0)
  leadTimeDays Int      @default(0)
  lotSize      Int      @default(1)
  item         Item     @relation(fields: [itemId], references: [id])
  locations    ItemLocation[]
}

model ItemLocation {
  id          String   @id @default(cuid())
  itemBranchId String
  bin         String
  lotNumber   String?
  qtyOnHand   Int      @default(0)
  qtyCommitted Int     @default(0)
  qtyOnOrder  Int      @default(0)
  itemBranch  ItemBranch @relation(fields: [itemBranchId], references: [id])
}

model InventoryTx {
  id          String   @id @default(cuid())
  tenantId    String
  itemId      String
  siteId      String
  location    String
  txType      String   // GRN|GI|ADJ|MOVE
  qty         Int
  unitCost    Decimal  @default(0)
  refType     String?
  refId       String?
  userId      String?
  createdAt   DateTime @default(now())
  item        Item     @relation(fields: [itemId], references: [id])
}

// --------------- Equipment & Operations (F1201/F4801) ---------------
model Equipment {
  id            String   @id @default(cuid())
  tenantId      String
  code          String   @unique
  type          String
  currentSiteId String?
  acquisitionCost Decimal @default(0)
  currentValue  Decimal  @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model UsageLog {
  id          String   @id @default(cuid())
  tenantId    String
  equipmentId String
  shiftDate   DateTime
  hoursUsed   Decimal   @default(0)
  loadUnits   Decimal   @default(0)
  createdAt   DateTime  @default(now())
  equipment   Equipment @relation(fields: [equipmentId], references: [id])
}

model Breakdown {
  id          String   @id @default(cuid())
  tenantId    String
  equipmentId String
  startAt     DateTime
  endAt       DateTime?
  reason      String?
  notes       String?
  createdAt   DateTime @default(now())
  equipment   Equipment @relation(fields: [equipmentId], references: [id])
}

model WorkOrder {
  id            String   @id @default(cuid())
  tenantId      String
  equipmentId   String
  type          String   // preventive|corrective|emergency
  status        String   // planned|released|in_progress|completed|canceled
  scheduledDate DateTime?
  estimatedCost Decimal  @default(0)
  actualCost    Decimal  @default(0)
  createdAt     DateTime @default(now())
  equipment     Equipment @relation(fields: [equipmentId], references: [id])
}

// --------------- Procurement & Finance ---------------
model PurchaseRequisition {
  id          String   @id @default(cuid())
  tenantId    String
  requesterId String
  status      String   // draft|submitted|approved|rejected|converted
  costCenter  String?
  projectId   String?
  createdAt   DateTime @default(now())
}

model PurchaseOrder {
  id          String   @id @default(cuid())
  tenantId    String
  supplierId  String
  status      String   // open|approved|partially_received|closed
  currency    String   @default("PGK")
  exchangeRate Decimal @default(1)
  deliveryDate DateTime?
  totalAmount Decimal  @default(0)
  createdAt   DateTime @default(now())
}

model GRN {
  id          String   @id @default(cuid())
  tenantId    String
  poId        String
  receivedAt  DateTime @default(now())
  userId      String?
  createdAt   DateTime @default(now())
  po          PurchaseOrder @relation(fields: [poId], references: [id])
}

model APInvoice {
  id          String   @id @default(cuid())
  tenantId    String
  poId        String?
  supplierId  String
  invoiceNo   String
  amount      Decimal  @default(0)
  currency    String   @default("PGK")
  status      String   // draft|matched|approved|posted|paid
  createdAt   DateTime @default(now())
}

model ARInvoice {
  id          String   @id @default(cuid())
  tenantId    String
  customerId  String
  rentalRefId String?  // link to rental usage
  amount      Decimal  @default(0)
  status      String   // draft|approved|posted|paid
  createdAt   DateTime @default(now())
}

model ChartAccount {
  id        String @id @default(cuid())
  company   String
  businessUnit String
  object    String
  subsidiary String
  project   String?
  description String
  currency  String @default("PGK")
}

model GLEntry {
  id          String   @id @default(cuid())
  tenantId    String
  accountId   String
  amount      Decimal
  currency    String   @default("PGK")
  exchangeRate Decimal  @default(1)
  batchNo     String
  batchType   String
  createdAt   DateTime  @default(now())
}

// --------------- HR, Payroll, CRM (P3/P4) ---------------
model Employee {
  id          String   @id @default(cuid())
  tenantId    String
  abId        String   // link to AddressBook
  orgUnitId   String?
  hireDate    DateTime?
  createdAt   DateTime @default(now())
}

model Leave {
  id          String   @id @default(cuid())
  employeeId  String
  type        String
  startDate   DateTime
  endDate     DateTime
  status      String   // requested|approved|rejected|taken
  createdAt   DateTime @default(now())
}

model Timesheet {
  id          String   @id @default(cuid())
  employeeId  String
  shiftDate   DateTime
  hoursWorked Decimal  @default(0)
  status      String   // drafted|submitted|approved|exported
  createdAt   DateTime @default(now())
}

model Ticket {
  id          String   @id @default(cuid())
  tenantId    String
  customerId  String
  type        String   // issue|service
  status      String
  createdAt   DateTime @default(now())
}
```

> Extend with foreign keys, indexes, unique constraints, and partitions as needed for scale. Keep migrations backward‑compatible (rolling upgrades).

---

## API Contracts & Folder Structure

### Folder Structure (server)
```
apps/api/
  src/
    trpc/ (routers, procedures)
    routes/ (REST handlers)
    services/ (domain logic)
    workflows/ (approval engine)
    events/ (publishers, consumers)
    db/ (prisma, migrations)
    auth/ (nextauth, rbac checks)
    middleware/
    config/
```

### Conventions
- **Naming**: `domain.action` (e.g., `ops.logUsage`, `inv.createGRN`, `fin.postJournal`).  
- **Idempotency**: Clients send `Idempotency-Key`; server stores hash against outcome.  
- **Errors**: Problem Details JSON with `code`, `message`, `hint`, `correlationId`.

### Example tRPC Procedure (usage logging)
```ts
export const opsRouter = router({
  logUsage: protectedProc
    .input(z.object({
      equipmentId: z.string(),
      shiftDate: z.string().datetime(),
      hoursUsed: z.number().min(0),
      loadUnits: z.number().min(0).optional(),
      idempotencyKey: z.string().uuid(),
      baseVersion: z.number().int().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.idem.ensure("ops.logUsage", input.idempotencyKey)
      // version check if needed...
      const usage = await ctx.db.usageLog.create({ data: { ...input, tenantId: ctx.tenant.id } })
      await ctx.events.publishTenant("ops.usage.created", { id: usage.id, equipmentId: usage.equipmentId })
      return usage
    })
})
```

### Example REST (SSE endpoint)
```ts
// GET /api/events/stream?cursor=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get("cursor")
  const stream = createSSEStream()
  // subscribe to Redis Streams with cursor
  subscribeTenantStreams(stream, cursor)
  return new Response(stream.readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
  })
}
```

---

## Eventing Model: Redis Streams + SSE

### Event Envelope
```json
{
  "id": "evt_01H...",
  "tenantId": "t_123",
  "type": "inv.grn.created",
  "entity": "GRN",
  "entityId": "grn_01H...",
  "version": 3,
  "createdAt": "2025-08-29T01:23:45Z",
  "payload": { "poId": "po_...", "siteId": "site_A", "lines": 3 }
}
```

### Channels/Streams (examples)
- `tenant:{id}:pub` (Pub/Sub fan‑out)  
- `tenant:{id}:stream` (Streams with replay)  
- Event types: `ops.usage.created`, `ops.breakdown.opened|closed`, `inv.grn.created`, `inv.gi.created`, `fin.ap.invoice.matched|approved|posted`, `mnt.wo.status.changed`.

### Cursor & Backfill
- Clients track last event ID; on reconnect pass `cursor`.  
- Server reads from Streams with `XREAD` from cursor; then switches to Pub/Sub for live push.

---

## Workflow Engine (Lite → Advanced)

### Data Structures (Lite)
```ts
type ApprovalThreshold = { level: number; min: number; max?: number; roles: string[] }
type ApprovalHistory = { level: number; actorId: string; action: "approve"|"reject"; at: string; note?: string }

interface WorkflowInstance<T> {
  id: string
  docType: "PR"|"PO"|"WO"|"AP_INV"|"GL_JE"
  docId: string
  status: "pending"|"approved"|"rejected"
  currentLevel: number
  thresholds: ApprovalThreshold[]
  history: ApprovalHistory[]
  data: T
}
```

### Routing Logic (PO Example)
```ts
function routePO(inst: WorkflowInstance<{ total: number }>) {
  const lvl = inst.thresholds.find(t => inst.data.total >= t.min && (t.max ? inst.data.total <= t.max : true))
  inst.currentLevel = lvl?.level ?? 1
  // notify approvers with role in lvl.roles via SSE
}
```

### Advanced (Later)
- SLA timers, escalations, conditional branches, resource calendars, simulation metrics.

---

## WBS → Product Backlog Mapping
- **P1**: `CORE‑*`, `OPS‑*`, `INV‑*`, `HYB‑*`, `DASH‑*`  
- **P2**: `FIN‑GL‑*`, `FIN‑AP‑*`, `FIN‑AR‑*`, `FIN‑FA‑*`, `PROC‑*`, `FIN‑RPT‑*`  
- **P3**: `HR‑*`, `PAY‑*`, `MNT‑*`  
- **P4**: `CRM‑*`, `BI‑*`, `SCHED‑RPT‑*`  

> Each ticket carries: **Goal**, **Acceptance**, **Telemetry**, **Rollback**, **Data Impact**.

---

## Acceptance Criteria & Test Strategy

### P1 Acceptance (sample)
- **Offline replay**: submit 100 queued forms; zero duplicates (verified by idempotency log).  
- **KPI pack**: MTTR/MTBS/Availability% equals reference calculations.  
- **SSE**: reconnect within ≤ 5s; backfill delivers missed events in order.

### P2 Acceptance
- **3‑way match**: reject mismatched invoices; approve correct; ensure GL postings.  
- **Period close**: lock prevents late postings; reopening logged & approved.  
- **Reports**: P&L/BS/CF/Aging/BvA generated & scheduled.

### Testing Layers
- Unit & integration (Vitest/Jest).  
- E2E (Playwright).  
- Performance (k6).  
- Security (ZAP).  
- Offline/resilience (airplane‑mode, network flaps).

---

## Security & Compliance
- **AuthN**: NextAuth + OIDC/SAML; optional MFA.  
- **AuthZ**: RBAC; row‑level scoping by tenant/site; field masking for sensitive data.  
- **Audit**: append‑only events with hash; coverage ≥ 95% for critical paths.  
- **Backups**: PITR ≥ 7 days; quarterly restore drills.  
- **Data Protection**: TLS everywhere; encryption at rest; least privilege secrets.

---

## Environments & Configuration Matrix

| Stage | Hosting | Data | Realtime | Observability |
|---|---|---|---|---|
| Stage 1 (Pilot) | Vercel / small Node svc | Neon Postgres, Upstash Redis, S3 | SSE + Pub/Sub | Sentry + basic metrics |
| Stage 2 (Growth) | AWS ECS/EKS / Fly Machines | RDS/Aurora, Redis Enterprise/ElastiCache, S3 | SSE + Pub/Sub/Streams | OTel collector + dashboards |
| Stage 3 (Enterprise) | AWS EKS private, multi‑AZ | Aurora Multi‑AZ, Redis Enterprise, S3 | SSE + Streams | Grafana/Loki/Tempo, SLOs & alerts |

**.env Keys (excerpt)**
```
AUTH_SECRET=
OIDC_ISSUER=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
DATABASE_URL=postgres://...
REDIS_URL=redis://...
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
SSE_HEARTBEAT_MS=15000
```

---

## Scaling Gates & Capacity Planning
- **MAU** > 1,000 tenant‑users for 2 months.  
- **API Throughput** > 100 req/s with p95 < 300 ms.  
- **Event Ingestion** > 1.5M/day (usage/breakdown/log).  
- **Worker Latency** p95 > 30 s → scale workers.

---

## Data Migration, Seeding & Cutover
- Versioned migrations (expand → backfill → contract).  
- Seed minimal master data (Address Book, Items, Equipment).  
- Mock cutover: data freeze, reconciliation, rollback plan.  
- Post‑cutover hypercare: 2–4 weeks, daily triage.

---

## Risk Register (Top 10)
1. Remote site connectivity → offline packs + replay; edge health checks.  
2. Scope creep → change control; milestone DoD gates.  
3. KPI data quality → mandatory fields; validations; reconciliation.  
4. Performance regressions → load tests; indexes; caching; profiling.  
5. Security misconfig → SSO/RBAC mandatory; secret mgmt; audits.  
6. Payroll mismatch → automated reconciliation; manual review queue.  
7. Vendor onboarding delays → early templates; parallel collection.  
8. Training gaps → role‑based training; quick‑refs; hypercare floor support.  
9. Backup/restore untested → quarterly drills; runbooks.  
10. Regulatory changes → configurable rates/tax; rapid patch process.

---

---

## Hybrid Online/Offline Playbook

> Enterprise-grade blueprint for resilient field operations with intermittent connectivity. Portable across serverless or containerized deployments; Postgres remains the single system of record.

### 1) Operating Model (Layered)
1. **Read-Only Cache (universal):** Cache critical master data (Machines, Items, Vendors, COA) in IndexedDB for lookups when offline.  
2. **Capture-and-Forward (most forms):** Queue user actions locally and replay when online with **idempotency keys** and **version checks**.  
3. **Offline Packs (selected flows):** Package domain datasets (e.g., job cards, inspections, rental hand-over) using IndexedDB/RxDB or SQLite (via Tauri/Capacitor). **Server-authoritative merge**; **CRDT** only for note-like text fields.  
4. **(Optional) Edge Gateway:** Lightweight proxy at remote sites to buffer events & SSE; no multi-master DB replication.

### 2) Sync Contracts
#### 2.1 Mutations (Push)
```ts
type LocalMutation = {
  id: string;                    // ULID/UUID
  kind: 'ops.logUsage'|'mnt.closeWO'|'inv.createPR'|string;
  payload: unknown;
  idempotencyKey: string;        // UUID v4
  baseVersion?: number;          // client's last-known record version
  createdAt: string;             // ISO-8601
}
```
- Service Worker (or app) performs background/batched `POST /sync/mutate` when online.
- Server implements **at-least-once** semantics with **idempotency de-dup**:
  - `idempotency_log(tenant_id, user_id, key, hash, result, committed_at)`.
  - If key exists → return stored result (no double-write).
  - If `baseVersion` mismatches → return **conflict** for UI review.

#### 2.2 Changes (Pull)
- **SSE** for live events while online.  
- **Backfill** on reconnect via `GET /sync/changes?cursor=...&limit=...`.  
- Single **monotonic cursor** per tenant stream (ULID/Redis Stream ID).

#### 2.3 Transactional Outbox
- Business change and outbox event are written in **one DB transaction**:
```sql
-- outbox table
CREATE TABLE outbox (
  id          bigserial PRIMARY KEY,
  tenant_id   text NOT NULL,
  type        text NOT NULL,
  entity      text NOT NULL,
  entity_id   text NOT NULL,
  version     int  NOT NULL,
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  delivered   boolean NOT NULL DEFAULT false
);
```
- Worker publishes to **Redis Streams**; SSE servers read for backfill & push.

### 3) Identity & Versioning
- Client-generated **stable IDs** (ULID/UUID) for offline-created rows.  
- **Tombstones** for deletions; server sets `version` and `updated_at`.  
- Mutations include `Idempotency-Key` + `baseVersion` for conflict detection.

### 4) Conflict Resolution
- **Single-writer (default):** LWW *only if same author*; else *requires review*.  
- **Mergeable (field-level):** Merge lists/attachments; CRDT for notes only.  
- **Sensitive (Inventory/Finance):** Do not overwrite; on stale version, create **adjustment** records; require online validation.

**UX:** “Conflicts” inbox with actions: *accept server*, *override*, *merge fields*, *create adjustment*.

### 5) Transport: SSE + Redis
- SSE (HTTP/1.1, proxy/CDN-friendly) with heartbeat & retry + cursor backfill.  
- Redis **Pub/Sub** for low latency, **Streams** for replay/consumer groups.  
- Ordering per entity guaranteed via `version` semantics.

### 6) Security & Compliance (Offline-Aware)
- Minimize offline data; encrypt local store (WebCrypto).  
- For stronger guarantees: Tauri/Capacitor + OS secure storage + encrypted SQLite.  
- Token/kunci berumur pendek; **remote revoke/wipe** for devices; TTL on offline packs.  
- RBAC field masking also applied by **pack builder** on the server.

### 7) Observability & SLOs
- Metrics: `offline.queue_length`, `offline.replay_rate`, `offline.conflict_rate`, `offline.time_to_drain`, `sse.reconnect_latency`, `events.lag_ms`, `idempotency.duplicates_blocked`.  
- SLO: queued mutations drained **≤ 5 minutes (p95)** post-connect; **0 lost writes**; KPI (MTTR/MTBS/Availability) unchanged after replay.

### 8) Anti-Patterns (Avoid)
- Two-way DB replication to clients.  
- Stateful WebSockets behind serverless without sticky sessions.  
- Storing plaintext secrets in IndexedDB.  
- Blind overwrites for stock/GL while offline.

### 9) Reference Implementation Snippets
#### 9.1 Client Queue (enqueue & flush)
```ts
// enqueue
await idb.mutations.add({
  id: crypto.randomUUID(),
  kind: 'ops.logUsage',
  payload: {...},
  idempotencyKey: crypto.randomUUID(),
  baseVersion: current?.version,
  createdAt: new Date().toISOString()
})

// flush
const batch = await idb.mutations.orderBy('createdAt').limit(100).toArray()
const res = await fetch('/sync/mutate', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ mutations: batch })
})
const { results } = await res.json()
for (const r of results) {
  if (r.status === 'applied') await idb.mutations.delete(r.localId)
  else if (r.status === 'conflict') await idb.conflicts.put(r)
}
```

#### 9.2 Server Idempotency + Version Check
```ts
// inside a transaction
const seen = await db.idempotency.findUnique({ where: { key: input.idempotencyKey, tenantId } })
if (seen) return seen.result

const record = await db.entity.findUnique({ where: { id: input.id } })
if (input.baseVersion != null && record.version !== input.baseVersion) {
  return conflict(record, input) // persist for review
}

const updated = await db.entity.update({ data: { /* ... */, version: { increment: 1 } }, where: { id: input.id } })
await db.idempotency.create({ data: { key: input.idempotencyKey, tenantId, result: updated } })
await db.outbox.create({ data: { type:'entity.updated', entity:'Entity', entityId: updated.id, version: updated.version, payload: {/* ... */} } })
return updated
```

#### 9.3 Outbox → Redis Streams → SSE
```ts
// worker publish
for await (const evt of streamOutbox(db)) {
  await redis.xadd(`tenant:${evt.tenantId}:stream`, '*', 'event', JSON.stringify(evt))
  await markDelivered(evt.id)
}

// SSE backfill: GET /sync/changes?cursor=...
```

### 10) Decision Matrix (Per Entity)
| Entity        | Offline Mode             | Conflict Policy                     | Notes                                  |
|---------------|--------------------------|-------------------------------------|----------------------------------------|
| UsageLog, Breakdown | Capture-and-Forward     | LWW (same author), else review       | No direct GL impact                     |
| WorkOrder Feedback  | Capture + Offline Pack  | Field merge                          | Show conflicts UI                       |
| PR/PO Draft         | Capture-and-Forward     | Review                               | High-value approvals online             |
| GRN/GI              | Online preferred        | Create **adjustment** on conflict    | Avoid offline stock changes             |
| Timesheet           | Capture-and-Forward     | Single-writer                        | Gate by role                            |
| Finance/GL Posting  | Online only             | N/A                                  | Serializable/locked periods required    |
| Notes/Comments      | Capture-and-Forward     | CRDT for text fields                 | Limit to text                           |

### 11) Implementation Order (Quick Start)
1. `/sync/mutate` + `/sync/changes` + **outbox** + **idempotency**.  
2. SSE stream + reconnect/backfill via Streams.  
3. Local queue + Background Sync + Outbox/Conflicts UI.  
4. Offline Packs (manifest, TTL, revoke).  
5. (Optional) Edge gateway for extreme sites.  
6. Observability dashboards for hybrid metrics.

### 12) Definition of Ready (Checklist)
- Schema: `version`, `updated_at`, **tombstone**, **idempotency_log**, **outbox** present.  
- FE: encrypted store, queue + retry w/ exponential backoff, jitter.  
- BE: atomic transactions, outbox publisher, SSE heartbeat & retry.  
- Tests: airplane-mode, time-skew, replay flood (≥10k), conflict storm, random disconnects.  
- Ops: procedures for **reindex cursor**, **replay Streams**, **device wipe**, **rebuild offline packs**.

## Appendices

### A. KPI Definitions
- **MTTR** = Total Repair Time / Number of Repairs.  
- **MTBS** = Total Runtime / Number of Breakdowns.  
- **Availability%** = (Total Time − Downtime) / Total Time.

### B. Naming & API Conventions
- `snake_case` in DB, `camelCase` in API/FE.  
- Events: `domain.action.pastTense` (e.g., `inv.grn.created`).  
- Routes: `/{domain}/{resource}` (REST) or `domain.action` (tRPC).

### C. Indexing & Partitioning (examples)
```sql
-- Time‑series partition for usage logs (monthly)
CREATE TABLE usage_log_y2025m08 PARTITION OF "UsageLog" FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

-- Common indexes
CREATE INDEX idx_gl_account_time ON "GLEntry"(accountId, createdAt);
CREATE INDEX idx_inv_tx_item_time ON "InventoryTx"(itemId, createdAt);
```

### D. Error Codes (excerpt)
- `E_IDEMPOTENT_REPLAY` — duplicate mutation ignored; returns original result.  
- `E_MATCH_FAILED` — 3‑way match did not balance.  
- `E_PERIOD_LOCKED` — posting in locked period.  
- `E_OFFLINE_CONFLICT` — merge conflict requires user review.

### E. Sample Telemetry Fields
- `correlationId`, `tenantId`, `route`, `latency`, `status`, `bytes`, `retries`, `cacheHit`, `dbTime`, `queueDepth`.

---

**End of Document — Implementation Guide v1.0**
