# Seller chat – E2E test guide

Use the seeded seller account and products to test Matrix chat (Write to seller) end-to-end.

## Credentials (from `credential.txt`)

| Role    | Email               | Password |
|---------|---------------------|----------|
| Seller  | seller@mercurjs.com | secret   |
| Admin   | dev@tese.io         | Tese@2024 |

## 1. Seed data (if not already done)

From the marketplace backend app:

```bash
cd tese-marketplace-backend/apps/backend
yarn seed
```

This creates:

- Seller: **seller@mercurjs.com** / **secret** (store name: Tese Store)
- Products including:
  - **Sustainable Packaging Audit** (with price, so “Write to seller” and Add to cart both show)
  - **Corporate Carbon Footprint (Scope 1 & 2)** (service, quote on request)
  - **ESG Consulting Session** (service, quote on request)
  - Plus other seeded products (sneakers, etc.)

## 2. Run the stack

- Backend: `http://localhost:9000`
- Storefront: `http://localhost:9001`
- Admin: `http://localhost:9002`
- Vendor panel: `http://localhost:9003`

Ensure backend has Matrix env in `.env`:

- `MATRIX_BASE_URL`, `MATRIX_SERVER_NAME`, `MATRIX_ADMIN_TOKEN`

Storefront `.env`:

- `NEXT_PUBLIC_MATRIX_CHAT_ENABLED=true`
- `NEXT_PUBLIC_MATRIX_HS_URL=https://matrix.tese.io` (or your Synapse URL)

## 3. Create a storefront customer (if needed)

On the storefront (http://localhost:9001):

- Go to **Account** → **Register**
- Create a customer (e.g. customer@test.com / Test123!)

## 4. Test “Write to seller” (customer → seller chat)

1. Open **http://localhost:9001** and log in as the **customer**.
2. Open a product by the seeded seller, e.g.:
   - **Sustainable Packaging Audit**:  
     http://localhost:9001/pl/products/sustainable-packaging-audit  
     (or your locale instead of `pl`)
   - Or **Corporate Carbon Footprint**, **ESG Consulting Session**, or any other seeded product from “Tese Store”.
3. On the product page, click **“Write to seller”**.
4. **If not logged in:** the modal should show “Please log in to message the seller” and a **Log in** link.
5. **If logged in:** the Chat modal should open; you may see “Loading chat…” then the Matrix chat UI (message list + composer).
6. Send a message and confirm it appears in the thread.

## 5. (Optional) Seller side – vendor panel

1. Open **http://localhost:9003** (Vendor panel).
2. Log in as **seller@mercurjs.com** / **secret**.
3. If the vendor panel has a Messages/Chat section linked to Matrix, open it and confirm you see the conversation with the customer and the message you sent from the storefront.

## Troubleshooting

- **“Write to seller” not visible**  
  - Product must have a **seller** in the API response.  
  - Ensure you’re on a product that belongs to the seeded seller (e.g. Sustainable Packaging Audit, Corporate Carbon Footprint).
- **“Could not start chat”**  
  - Backend must reach Synapse (`MATRIX_BASE_URL`).  
  - Check backend logs and that `MATRIX_ADMIN_TOKEN` is valid.
- **No products after seed**  
  - Run `yarn seed` from `apps/backend` again (idempotent for many steps; may duplicate seller if auth already exists – use a fresh DB if you need a clean state).
