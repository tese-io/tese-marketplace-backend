# Syncing from Upstream (Mercur)

This repo is based on the Mercur marketplace template. To pull in upstream changes while preserving TESE-specific customizations, follow this guide.

## Remotes

- `origin` – your TESE fork (push/pull your work here).
- `upstream` – add the original Mercur repo, e.g.:
  ```bash
  git remote add upstream https://github.com/medusajs/mercur.git
  ```
  (Replace with the actual Mercur upstream URL if different.)

## Merge workflow

1. Fetch and merge from upstream:
   ```bash
   git fetch upstream
   git merge upstream/main
   ```
   Use the branch name your upstream uses (e.g. `main` or `master`).

2. Resolve conflicts. Pay special attention to the **customizations** list below so you don’t lose TESE changes.

## TESE customizations to preserve

When resolving conflicts or reviewing merges, ensure these are kept or re-applied:

- **Service fulfillment (digital / no delivery)**
  - `apps/backend/src/workflows/fulfillment-set/ensure-service-fulfillment-set.ts` – ensures each seller has a “Service – no delivery” shipping option.
  - `apps/backend/src/scripts/seed.ts` – calls `ensureServiceFulfillmentSetForSeller` after creating seller shipping option.
  - `apps/backend/src/api/vendor/stock-locations/[id]/fulfillment-sets/route.ts` – after creating a shipping fulfillment set, ensures the seller has the service (digital) fulfillment set and option.
- **Store product API** – if you added or changed anything so that product `metadata` (e.g. `listing_type`) is included in store product responses, preserve those changes.
- **Seed / onboarding** – any changes that create the “service” fulfillment set or zero-price “Service – no delivery” option for sellers.

## Tips

- Prefer **additive** changes (new files or new branches in existing logic) so upstream merges stay straightforward.
- Service behavior is **metadata-driven** (`metadata.listing_type === 'service'`); avoid changing core flows for all products.
