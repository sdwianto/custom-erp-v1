Technical & Commercial Proposal — Custom ERP for CA Mine (Enterprise-Grade, Hybrid Online/Offline)

Version: 1.0
Date: September 4, 2025
Proposer: NextGen Technology Limited
Prepared For: CA Mine (RFQ Response)

1) Executive Summary

We propose a modular, enterprise-grade ERP tailored to mining equipment rental operations. The system prioritizes resilient field operations (low connectivity), integrated inventory & procurement, strong financial controls, HR/Payroll bridging, advanced maintenance, and actionable reporting/BI.
Architecture emphasizes portability, reliability, and auditability: Next.js (App Router) + TypeScript, tRPC/REST, Prisma + PostgreSQL, Redis (Pub/Sub + Streams), and SSE for real-time updates with an offline-first UX.

Business outcomes

Lower downtime via preventive maintenance and live KPIs (MTTR/MTBS/Availability%).

Tighter cost & stock control with GRN/GI integrity and 3-way match (PO–GRN–Invoice).

Continuous ops in remote sites through capture-and-forward and SSE backfill.

Minimal lock-in: PostgreSQL as system of record; cloud-agnostic services.

2) Scope & Priorities (Aligned to RFQ)
Priority 1 — Core Operations & Reporting

Platform: SSO/IdP, RBAC, audit trail, notifications, global search, responsive shell.

Hybrid backbone: offline lookup cache; capture-and-forward queue; idempotent replay; SSE reconnect/backfill.

Operations: equipment master; usage & load per shift; breakdown capture; rental hours.

Inventory (core): item master; multi-store stock; GRN/GI; basic PR→PO.

Dashboards & KPIs: MTTR, MTBS, Availability%, breakdown lists & utilization.

DoD P1: Offline replay with zero duplicates (idempotency); SSE backfill in order; GRN/GI & PR→PO E2E with audit.

Priority 2 — Finance Foundations & Advanced Procurement

GL (dimensional COA, journals, trial balance, period controls/locking).

AP (3-way match, payments), AR (rental invoices), FA (register + depreciation).

Advanced procurement: reorder points & alerts, PO approvals, vendor management.

Reporting: P&L, Balance Sheet, Cash Flow, AR/AP Aging, Budget vs Actual.

DoD P2: 3-way match strictly enforced; automated GL postings; period close & scheduling of financial reports.

Priority 3 — HR/Payroll Bridge & Advanced Maintenance

HRMS: employee master, org structure, leave (ESS + approval + accrual), attendance & 12-hour shifts, R&R tracking.

Payroll bridge: export/import (incl. NCSL), reconciliation vs telematics.

Maintenance: WO lifecycle, preventive (hours/date), parts consumption linked to Inventory.

DoD P3: Payroll reconciliation identifies variances; WO E2E including parts and costs.

Priority 4 — CRM & BI

CRM: rental Sales Orders, service tickets, interaction logs.

BI: role-based dashboards, ad-hoc report builder, scheduled email reports.

DoD P4: SO→AR flow; ad-hoc builder available; report scheduling active.

3) Target Architecture

Frontend: Next.js (App Router), TypeScript, Tailwind + shadcn/ui, React Query, PWA.

API: Next.js Route Handlers (Node runtime) / tRPC or REST; Zod validation; idempotent mutations (Idempotency-Key).

Database: PostgreSQL (Neon early → AWS RDS/Aurora), Prisma with versioned migrations; indexing/partitioning for high volume.

Realtime: SSE to clients; Redis Pub/Sub (low latency) + Redis Streams (replay/consumer groups).

Offline: read-only caches; capture-and-forward queue; selective offline packs; server-authoritative merges.

Observability: Sentry + OpenTelemetry (traces/logs/metrics); SLO p95 API ≤ 300 ms @ 100 rps; worker p95 ≤ 30 s.

CI/CD: GitHub Actions, environment promotions, smoke/canary checks, auto-rollback.

Key ADRs

ADR-001: SSE + Redis as default; WebSockets only with proven need.

ADR-002: tRPC/REST now; GraphQL when BI/federation justifies.

ADR-003: Unified Address Book & dimensional COA (phased).

ADR-004: Multi-company/currency gated post-P3 once reports are ready.

4) Hybrid Online/Offline (RFQ-Critical)

Local queue (IndexedDB): batch flush on connectivity; at-least-once + idempotency on server.

Versioning & conflicts: per-record version; client sends baseVersion; conflicts routed to Conflict Inbox (accept server/override/field-merge/adjustment).

Backfill: client tracks last_event_id; reconnect triggers Redis Streams XREAD backfill, then live SSE fan-out.

Security: minimal on-device data; client-side encryption; remote revoke/wipe; TTL on offline packs.

5) RFQ Traceability — Mapping to Deliverables
RFQ Area	Module(s)	Core Deliverables
Equipment & Rental Ops	Equipment, Usage/Breakdown, Rental Hours	Ops UI/API, SSE dashboards, audit trail
Inventory & Procurement	Item/Stock, GRN/GI, PR→PO, Reorder, Vendor	PR→PO E2E, 3-way match (P2), vendor rating
Finance	GL, AP/AR, FA, Financial Reports	Dimensional COA, automated postings, period close
HR/Payroll Bridge	Employee, Timesheet, Leave, Export/Import	ESS, payroll reconciliation (incl. NCSL)
Maintenance	WO lifecycle, Preventive, Parts	WO E2E, parts consumption to Inventory
CRM & BI	SO, Tickets, Ad-hoc BI	SO→AR, builder, scheduled reports
Non-Functional	SSO/RBAC, Audit, Offline, Realtime, Observability	SLOs, Sentry/OTel, PITR backups, runbooks
6) Implementation Plan & Schedule (Indicative)

Core delivery ~10 weeks + 2–4 weeks hypercare. Adjustable to data readiness and user availability.

Phase	Duration	Scope	Milestone
P1	2 weeks	Platform + Ops + Core Inventory + Offline backbone + KPI pack	Go-Live 1
P2	3 weeks	GL/AP/AR/FA + Advanced Procurement + Financial Reports	Go-Live 2
P3	2 weeks	HRMS + Payroll Bridge + Advanced Maintenance	Go-Live 3
P4	2 weeks	CRM + BI (builder & scheduling)	Go-Live 4
T&O	1 week	Performance tuning, security hardening, UAT final	Production Cutover
Hypercare	2–4 wks	Daily support & fixes	Stabilization

Governance: daily stand-ups, weekly steering, end-phase demos, change control for scope adjustments.

7) Acceptance & QA

Offline replay: submit 100 queued forms → 0 duplicates (idempotency log proof).

3-way match: mismatched invoices rejected; correct matches post to GL.

KPIs: MTTR/MTBS/Availability% match reference calculations.

Security: SSO/IdP, RBAC; audit coverage ≥ 95% on critical paths; ZAP scan pass.

Performance: API p95 ≤ 300 ms; SSE reconnect ≤ 5 s; ordered backfill.

Backup/DR: PITR enabled; quarterly restore drill documented.

8) Data Migration & Cutover

Strategy: expand → backfill → contract (rolling migrations).

Seeding: Address Book, Items, Equipment.

Cutover: data freeze, final import, reconciliation (stock/GL), rollback plan.

Post-go-live: 2–4 weeks hypercare with daily triage.

9) Security, Compliance & Operations

AuthN/AuthZ: NextAuth + OIDC/SAML (Azure AD/Okta), optional MFA; RBAC with row-level scoping.

Audit: append-only events (admin, approvals, postings) with tamper evidence (hash).

Data Protection: TLS, encryption at rest; least-privilege secrets.

Backups & DR: PITR ≥ 7 days (expandable); restore drills quarterly.

Observability: Sentry + OTel (traces/logs/metrics), SLO dashboards & alerts.

10) Project Team

PM / Delivery Lead (1)

Solution Architect / Tech Lead (1)

Backend Engineers (Node/Prisma) (2)

Frontend Engineers (Next.js/RSC) (2)

Data/BI Engineer (1; P4)

QA/Automation (1)

DevOps/SRE (1)

BA / Mining SME (shared)

11) Commercial Model

(Indicative — final numbers upon SoW sign-off.)

Option A — Fixed-Price per Phase (P1–P4): clear scope, changes via CR.

Option B — Time & Materials (with cap): suitable for exploratory BI/CRM/integrations.

Warranty: 60-day defect warranty per phase post go-live.

Support: annual Support & Maintenance plan (SLA below).

12) SLA for Support & Maintenance
Severity	Example	Response	Workaround	Resolution
S1	Production down, data loss	≤ 1h	≤ 4h	≤ 24h
S2	Major function degraded	≤ 2h	≤ 1 day	≤ 3 days
S3	Minor defect/UX	≤ 1 day	N/A	Next sprint
S4	Feature request	≤ 2 days	N/A	Backlog/roadmap

Targets: Production uptime ≥ 99.5%, RPO ≤ 15 min, RTO ≤ 4 h (enterprise tier).

13) Risks & Mitigations

Remote connectivity → offline packs, idempotent replay, SSE backfill.

Scope creep → change control; phase DoD gates.

KPI data quality → validations & reconciliation.

Performance regressions → k6 load tests; indexes/caching; observability.

Security misconfig → hardening checklist; periodic audits.

User adoption → role-based training, quick-refs, hypercare.

Vendor data delays → early templates; parallel data collection.

Payroll mismatch → automated reconciliation + manual review queue.

Restore untested → quarterly drills; runbooks.

Regulatory change → configurable rates/taxes; rapid patching.

14) Assumptions & Exclusions

Third-party integrations (telematics, payroll engine, DMS) via standard API/CSV; custom adapters scoped separately.

Managed cloud services (Neon/Upstash/AWS) provisioned per agreed access & subscription.

Additional localization/currencies beyond PGK available in P3/P4.

15) RFQ Compliance Statement (Summary)

Operations & Rental: Compliant

Inventory, GRN/GI, PR→PO: Compliant

Advanced Procurement + Approvals: Compliant

Finance (GL/AP/AR/FA) + Reports: Compliant

Hybrid/Offline (field ops): Compliant

HR/Payroll Bridge & Advanced Maintenance: Compliant

CRM & BI: Compliant

Security, Audit, Observability, Backup/DR: Compliant

16) Appendix — WBS (Condensed)

CORE-*: Auth/RBAC, Audit, Notifications, Search, Config

HYB-*: Offline queue, SSE, idempotency, Conflict Inbox

OPS-*: Equipment, Usage, Breakdown, Rental Hours

INV-*: Item, Stock, GRN/GI, PR→PO

FIN-GL/AP/AR/FA-*: COA, Journals, 3-way match, FA, Reports

PROC-*: Reorder, Vendor mgmt, PO Approvals

HR-* / PAY-*: Employee, Leave, Timesheet, Payroll bridge

MNT-*: WO lifecycle, Preventive, Parts

CRM-* / BI-* / SCHED-RPT-*: SO, Tickets, BI Builder, Schedules

Closing

This proposal is execution-ready, built directly on the Implementation Guide v1.0 with concrete architecture, delivery phases, acceptance criteria, and a proven hybrid strategy. We can provide a final Statement of Work (SoW) with detailed effort and pricing on confirmation.

End of Proposal