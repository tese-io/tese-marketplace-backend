# Mercur Connect — Production Implementation Plan

> **Goal:** Make TESE Mercur Connect production-ready for vendor catalog sync (Shopify, Magento, Custom API).

**Architecture:** Fix the broken DB layer first via a Knex repository (same pattern as `@mercurjs/reviews` utils), then harden security and sync scale. Medusa `ConnectModuleService` remains registered for future migration snapshot fix.

**Tech stack:** Medusa v2 plugin (`@tese/connect`), Knex/PostgreSQL, vendor-panel + admin-panel React.

---

## Phase 1 — Unblock (P0) ← **current**

| Task | Status |
|------|--------|
| Knex `connect-repository` with full CRUD | In progress |
| Wire `resolveConnectService()` to repository | Pending |
| Shopify OAuth state in DB (not memory) | Pending |
| Admin panel `Code` → `Brackets` icon fix | Pending |
| `VENDOR_PANEL_URL` in `.env.template` | Pending |
| Rebuild plugin + smoke-test connect APIs | Pending |

## Phase 2 — MVP connector (P1)

| Task | Notes |
|------|-------|
| Shopify/Magento pagination | Full catalog sync |
| Sync approval alignment | Use request flow when `require_approval: true` |
| Product delete handling | Archive on Shopify delete webhook |
| Sync history UI | Show `sync_runs` in vendor panel |
| Admin installations dashboard | Verify after Phase 1 |
| `MERCUR_CONNECT.md` runbook | Env vars, Shopify app setup |

## Phase 3 — Production hardening (P2)

| Task | Notes |
|------|-------|
| Fix Medusa module snapshot | Generate `.snapshot-mercur.json`, revert to `connect` module key |
| Inventory sync to stock locations | Not just product metadata |
| Observability | Structured sync logs, metrics |
| Retire legacy `tese-backend` Shopify | Remove dual SoT |
| Integration tests | Provider toggle, Magento connect, sync mock |

## Phase 4 — Deferred (P3)

Outbound orders, Shopify GraphQL bulk, AI category mapping, DLQ dashboard.

---

## Verification checklist (Phase 1 done when)

- [ ] `GET /vendor/connect/providers` → 200
- [ ] `GET /vendor/connect/installations` → 200
- [ ] `POST /vendor/connect/magento` → 200 (with provider enabled)
- [ ] `GET /vendor/connect/installations/:id` → 200
- [ ] `POST /vendor/connect/installations/:id/sync` → 200 or structured error
- [ ] `GET /admin/connect/installations` → 200
- [ ] Admin Mercur Connect page loads without error boundary
- [ ] Vendor Integrations page loads (already fixed)
