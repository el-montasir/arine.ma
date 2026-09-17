# مكتبة أرين للكتب الشرعية — Arine Bookstore

A Moroccan Islamic bookstore: **React + Vite** frontend backed by a self-hosted **Node.js / Express + Prisma + PostgreSQL** REST API, with a working Arabic RTL checkout (الدفع عند الاستلام / cash on delivery).

```
React + Vite
      ↓
REST API
      ↓
Node.js + Express
      ↓
Prisma
      ↓
PostgreSQL
```

---

## Requirements

- **Node.js** ≥ 20 (tested on 24)
- **npm** ≥ 10
- **Docker** + **Docker Compose** (to run PostgreSQL) — *or* any PostgreSQL 14+ instance

## Quick start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

This starts `postgres:16-alpine` on `localhost:5432` with database `arine`, user `arine` and password `arine_dev_password` (all overridable through a root-level `.env` — see `docker-compose.yml`). The data survives restarts in the `postgres_data` volume.

### 2. Backend

```bash
cd server
npm install
cp .env.example .env      # adjust DATABASE_URL if needed
npm run db:migrate        # apply Prisma migrations + generate the client
npm run db:seed           # load the existing Arine catalog into PostgreSQL
npm run dev               # → http://localhost:4000/api
```

### 3. Frontend

```bash
# from the repo root
npm install
cp .env.example .env      # sets VITE_API_URL=http://localhost:4000/api
npm run dev               # → http://localhost:5173
```

Open http://localhost:5173, add a book to the cart, and check out.

---

## Environment variables

| File                | Variable        | Default                              | Purpose                               |
| ------------------- | --------------- | ------------------------------------ | ------------------------------------- |
| `server/.env`       | `DATABASE_URL`  | `postgresql://arine:arine_dev_password@localhost:5432/arine` | PostgreSQL connection  |
| `server/.env`       | `PORT`          | `4000`                               | API port                              |
| `server/.env`       | `FRONTEND_URL`  | `http://localhost:5173`              | Allowed CORS origin                   |
| root `.env`         | `VITE_API_URL`  | `http://localhost:4000/api`          | API base URL used by the frontend     |

Compose overrides (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`) can be set at the repo root in a `.env` — defaults match the example `DATABASE_URL`.

Never commit real `.env` files — they are git-ignored (`.env`, `.env.*`, `!.env.example`).

## Database

Models (see `server/prisma/schema.prisma`): `Category`, `Product`, `Order`, `OrderItem`, plus the `OrderStatus` and `PaymentMethod` enums.

```bash
npm run db:migrate       # prisma migrate deploy + generate client
npm run db:migrate:dev   # interactive dev migration (creates next migration)
npm run db:seed          # reset + re-seed catalog deterministically (preserves product ids 1..18)
npm run db:reset         # drop, re-migrate, re-seed
npm run db:generate      # regenerate the Prisma client
```

**Products & categories** come from the existing frontend catalog (`src/data/books.js`, `src/data/categories.js`). The seed is safe to run repeatedly — it replaces the catalog and keeps the original numeric product IDs so the frontend cart/favorites stay compatible. Note that the seed resets catalog data (and any test orders) deterministically.

## API

All routes are prefixed `/api`. Success/error responses use a consistent envelope:

```json
{ "success": true, "data": [...] }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

| Method | Route                       | Description                                          |
| ------ | --------------------------- | ---------------------------------------------------- |
| GET    | `/api/health`               | Health check                                         |
| GET    | `/api/products`             | All products (filtered catalog)                      |
| GET    | `/api/products?search=...`  | Search by title / author / category                  |
| GET    | `/api/products?category=...`| Filter by category slug **or** name                  |
| GET    | `/api/products?sort=...`    | `popular` · `newest` · `price-asc` · `price-desc`    |
| GET    | `/api/products/:id`         | Single product (404 if missing)                      |
| GET    | `/api/categories`           | Categories with live product counts                  |
| POST   | `/api/orders`               | Create an order (validated, prices computed server-side) |
| GET    | `/api/orders/:orderNumber`  | Look up an order by its number (e.g. `AR-20260916-1234`) |

### Placing an order

```bash
curl -X POST http://localhost:4000/api/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "محمد أمين",
    "phone": "0612345678",
    "city": "فاس",
    "address": "شارع الحسن الثاني، رقم 123",
    "note": "اتصل بي قبل التوصيل",
    "paymentMethod": "CASH_ON_DELIVERY",
    "items": [{ "productId": 1, "quantity": 2 }]
  }'
```

- Required: `fullName`, `phone`, `city`, `address`, `paymentMethod`, `items` (≥ 1 item). `note` is optional.
- **The backend trusts nothing from the browser for money.** Real product prices are read from PostgreSQL; `unitPrice`, `orderItem.totalPrice`, `subtotal`, `shipping`, and `total` are all computed server-side inside a single Prisma transaction. `productTitle` and `unitPrice` are stored as snapshots on each `OrderItem` so old orders stay historically correct.
- Shipping: **subtotal ≥ 300 DH → free**, otherwise **25 DH**.
- Order numbers look like `AR-YYYYMMDD-XXXX` and are unique (UNIQUE column + collision-retry).

### Testing an order end-to-end

1. Open http://localhost:5173 → **الكتب**
2. Add a book, open the cart, go to **إتمام الطلب**
3. Fill in the name, a Moroccan phone, city, address (note is optional), keep **الدفع عند الاستلام**
4. Click **تأكيد الطلب** — the API validates, prices are recomputed server-side, the order is created, and you land on **/order-success** with the order number.
5. Confirm in PostgreSQL: `docker exec -it arine_postgres psql -U arine -d arine -c "select * from orders order by id desc limit 1;"`.

If the backend is unreachable the checkout shows an error, **keeps your cart and form data**, and lets you retry — nothing is cleared until the server confirms the order.

## Troubleshooting

- **`PrismaClientInitializationError / can't reach database`** — is PostgreSQL running? `docker compose ps`; then retry `npm run db:migrate`.
- **Port 5432 already in use** — the included Docker Postgres defaults to `5432`; point `DATABASE_URL` at another instance/port instead.
- **CORS errors in the browser** — make sure `server/.env` `FRONTEND_URL` matches the frontend origin exactly.
- **Frontend shows the amber “local catalog” banner** — the API is down; the store still works with the bundled catalog. Fix the backend and reload.
- **Seed says unknown category** — you added a book to `src/data/books.js` whose `category` doesn't exist in `src/data/categories.js`.

## Project structure

```
├── docker-compose.yml        # PostgreSQL
├── src/                      # React frontend
│   ├── context/CartContext.jsx
│   ├── hooks/useProducts.js  # API-backed products (local fallback)
│   ├── pages/                # Shop, BookDetails, Checkout, OrderSuccess, …
│   └── utils/api.js          # fetch wrapper (VITE_API_URL)
└── server/                   # Express + Prisma backend
    ├── prisma/schema.prisma  # models + enums
    ├── prisma/seed.js        # catalog seed
    └── src/
        ├── app.js            # middleware, routes, error handling
        ├── routes/           # products · categories · orders
        ├── controllers/
        ├── services/         # order pricing in a Prisma transaction
        ├── middleware/       # validation + centralized errors
        └── utils/            # order-number, shipping rule, responses
```