# Vendor (Seller-Facing) API Routes

This directory contains all vendor-facing API routes for the TESE Marketplace following the MedusaJS pattern.

## Directory Structure

```
vendor/
├── rfq/                              # RFQ (Request for Quotation) Management
│   ├── query-config.ts              # Query field definitions
│   ├── validators.ts                # Request/response validators
│   ├── middlewares.ts               # Route middlewares
│   ├── route.ts                     # GET (list RFQs)
│   ├── [id]/
│   │   ├── route.ts                # GET (single RFQ)
│   │   └── create-quote/
│   │       └── route.ts            # POST (create quotation for RFQ)
│
├── services/                         # Service Marketplace Management
│   ├── query-config.ts              # Query field definitions
│   ├── validators.ts                # Request/response validators
│   ├── middlewares.ts               # Route middlewares
│   ├── route.ts                     # GET (list), POST (create services)
│   ├── [id]/
│   │   ├── route.ts                # GET, PUT (update), DELETE
│   │   └── tiers/
│   │       └── route.ts            # PUT (manage service tiers)
│
├── quotations/                       # Quotation Management
│   ├── query-config.ts              # Query field definitions
│   ├── validators.ts                # Request/response validators
│   ├── middlewares.ts               # Route middlewares
│   ├── route.ts                     # GET (list quotations)
│   ├── [id]/
│   │   └── route.ts                # GET (single quotation)
│   └── stats/
│       └── route.ts                # GET (quotation statistics)
│
├── escrow/                           # Escrow Payment Management
│   ├── query-config.ts              # Query field definitions
│   ├── validators.ts                # Request/response validators
│   ├── middlewares.ts               # Route middlewares
│   ├── route.ts                     # GET (list escrow transactions)
│   ├── [id]/
│   │   └── route.ts                # GET (single escrow transaction)
│   └── stats/
│       └── route.ts                # GET (escrow statistics)
│
├── service-orders/                   # Service Order Management
│   ├── query-config.ts              # Query field definitions
│   ├── validators.ts                # Request/response validators
│   ├── middlewares.ts               # Route middlewares
│   ├── route.ts                     # GET (list service orders)
│   ├── [id]/
│   │   ├── route.ts                # GET (single service order)
│   │   ├── submit-deliverable/
│   │   │   └── route.ts            # POST (submit deliverable)
│   │   ├── request-payment-release/
│   │   │   └── route.ts            # POST (request payment release)
│   │   └── milestones/
│   │       └── [milestoneId]/      # Milestone management
│
└── disputes/                         # Dispute Management
    └── [id]/
        └── submit-evidence/
            └── route.ts            # POST (submit dispute evidence)
```

## Key Features

### RFQ Management (`/vendor/rfq`)
- **GET /vendor/rfq** - List RFQs filtered by seller
  - Supports pagination, filtering by status, type, priority
  - Returns: rfqs[], count, offset, limit

- **GET /vendor/rfq/:id** - Retrieve specific RFQ with detailed fields
  - Includes quotation_versions, line_items, terms, attachments

- **POST /vendor/rfq/:id/create-quote** - Create quotation for RFQ
  - Validates total_amount, currency, valid_until, delivery_days
  - Supports line_items and terms configuration
  - Returns created quotation

### Services Management (`/vendor/services`)
- **GET /vendor/services** - List seller's services with pagination
- **POST /vendor/services** - Create new service
  - Supports service types: esg_audit, carbon_consulting, sustainability_strategy, etc.
  - Configurable tiers, budget, duration
- **GET /vendor/services/:id** - Retrieve service with detailed fields
- **PUT /vendor/services/:id** - Update service
- **DELETE /vendor/services/:id** - Archive service
- **PUT /vendor/services/:id/tiers** - Manage service tiers (basic, pro, enterprise)

### Quotations Management (`/vendor/quotations`)
- **GET /vendor/quotations** - List all quotations for seller
  - Filter by status (sent, viewed, in_negotiation, accepted, rejected)
  - Filter by rfq_request_id
- **GET /vendor/quotations/:id** - Retrieve quotation with line items and terms
- **GET /vendor/quotations/stats** - Quotation statistics
  - total_quotes, accepted, rejected, pending, conversion_rate

### Escrow Management (`/vendor/escrow`)
- **GET /vendor/escrow** - List escrow transactions
  - Filter by status, type
- **GET /vendor/escrow/:id** - Retrieve escrow transaction details
- **GET /vendor/escrow/stats** - Escrow statistics
  - total_held, total_released, disputed_count, total_transactions

### Service Orders Management (`/vendor/service-orders`)
- **GET /vendor/service-orders** - List service orders
  - Filter by status, service_id
- **GET /vendor/service-orders/:id** - Retrieve service order details
  - Includes milestones, buyer_notes, seller_notes
- **POST /vendor/service-orders/:id/submit-deliverable** - Submit work for review
  - Accepts deliverable_url, description, seller_notes
- **POST /vendor/service-orders/:id/request-payment-release** - Request escrow release
  - Triggers milestone_completed trigger
  - Returns release details

## Authentication & Authorization

All routes are protected with `AuthenticatedMedusaRequest`:
- Uses `fetchSellerByAuthActorId()` to get seller context from auth_actor_id
- Automatically filters results by seller_id
- Ensures vendors only access their own data

## Query Configuration

Each module includes:
- **query-config.ts** - Defines field selection for list and retrieve operations
- Optimizes queries by selecting only necessary fields
- Supports nested field selection (e.g., 'tiers.*', 'milestones.*')

## Validators

Each module includes:
- **validators.ts** - Zod schemas for request/response validation
- Type-safe request/response types exported as TypeScript types
- Strict mode enabled on POST/PUT requests

## Middlewares

Each module includes:
- **middlewares.ts** - MedusaJS middleware route definitions
- Query validation and transformation
- Body validation and transformation
- Automatic query config application

## Integration with Other Modules

Routes integrate with:
- **@mercurjs/service-marketplace** - Service CRUD operations
- **@mercurjs/service-order** - Service order management
- **@mercurjs/escrow-payment** - Payment escrow handling
- **RFQ Workflows** - Quotation creation workflow
- **Query API** - Data retrieval using MedusaJS query system

## Error Handling

Standard MedusaError patterns:
- `NOT_FOUND` (404) - Resource not found
- `INVALID_DATA` (400) - Validation errors
- `CONFLICT` (409) - Business logic violations

## Response Format

Standard JSON response format:
```json
{
  "rfqs": [...],
  "count": 10,
  "offset": 0,
  "limit": 50
}
```

Single resource responses:
```json
{
  "resource": { ... }
}
```

Stats responses:
```json
{
  "stats": {
    "metric_1": value,
    "metric_2": value
  }
}
```
