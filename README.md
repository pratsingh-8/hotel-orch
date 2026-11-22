# Hotel Offer Orchestrator

Aggregates overlapping hotel offers from two mock suppliers, de-duplicates by hotel name (cheapest wins), caches the result in Redis, and filters by price range **inside Redis**. The aggregation is orchestrated by a **Temporal** workflow.

**Stack:** Node.js 20 (plain JavaScript, CommonJS), Express, Temporal, Redis, Docker Compose.

## Architecture

```
Client ──GET /api/hotels?city=delhi&minPrice&maxPrice──▶ Express API
                                                           │ start workflow
                                                           ▼
                                                    Temporal Server
                                                           │
                                                           ▼
                                        Worker: hotelOffersWorkflow
                                          ├─ fetchSupplierHotels(A) ┐ parallel
                                          ├─ fetchSupplierHotels(B) ┘ (3 attempts, backoff)
                                          ├─ selectBestOffers()  (dedupe, cheapest wins)
                                          └─ saveHotelsToRedis()
                                                           │
API ◀── result ──┘   if minPrice/maxPrice: ZRANGEBYSCORE in Redis ──▶ Redis
```

| Service  | Role |
|----------|------|
| `api`    | Express: `/api/hotels`, `/health`, mock suppliers (`/supplierA/hotels`, `/supplierB/hotels`), failure-simulation admin routes |
| `worker` | Temporal worker running the workflow + activities (same image, different command) |
| `temporal` | Temporal dev server (UI at http://localhost:8233) |
| `redis`  | Cache + price-range filtering |

### Redis layout (per city)
- `hotels:<city>:prices` — **ZSET**, member = normalized hotel name, score = price
- `hotels:<city>:data` — **HASH**, field = normalized hotel name, value = JSON offer

Filtering = `ZRANGEBYSCORE <zset> <min|-inf> <max|+inf>` followed by `HMGET` on the hash. The list is swapped atomically (`MULTI`: DEL + ZADD + HSET + EXPIRE, TTL `CACHE_TTL_SECONDS`, default 300).

### Design decisions
- **Partial results:** if one supplier fails after retries, the response uses the other supplier's data and sets an `X-Degraded-Suppliers` header. If both fail → `502`.
- **Retries:** each supplier activity has a 10s timeout and 3 attempts (500ms → 1s backoff).
- **Dedupe:** name match is case/whitespace-insensitive. Equal price → higher `commissionPct` wins (assumption; spec didn't define a tie-break).
- **Sorting:** results sorted by price ascending.
- **Fresh data each call:** every request runs the workflow (refreshing Redis); price filtering is then served from Redis.
- Mock suppliers are served by the API process; the worker calls them over HTTP (`SUPPLIER_BASE_URL`), so they behave like real external APIs.

## Run with Docker Compose

```bash
docker compose up --build
```

Wait for `worker started` and `api listening` in the logs, then:

```bash
curl "http://localhost:3000/api/hotels?city=delhi"
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=9000"
curl "http://localhost:3000/api/hotels?city=atlantis"      # []
curl  http://localhost:3000/health
```

Stop: `docker compose down`. Inspect workflows at http://localhost:8233.

## Run locally (without Docker for the app)

```bash
docker compose up redis temporal -d
cp .env.example .env            # defaults work for localhost
npm install
npm run start:api               # terminal 1
npm run start:worker            # terminal 2
npm test                        # unit tests for the dedupe logic (node:test, no extra deps)
```
No build step. Export the variables from `.env` into your shell, or just rely on the defaults.

## API

### `GET /api/hotels?city=<city>[&minPrice=<n>][&maxPrice=<n>]`
Returns `200` with:
```json
[
  { "name": "Ibis Central", "price": 4500, "supplier": "Supplier B", "commissionPct": 16 },
  { "name": "Holtin", "price": 5340, "supplier": "Supplier B", "commissionPct": 20 },
  { "name": "Radison", "price": 5900, "supplier": "Supplier A", "commissionPct": 13 }
]
```
Errors: `400` missing city / invalid or inverted price range · `502` all suppliers down.

### `GET /health`
Checks Supplier A, Supplier B, Redis and Temporal.
`200 {"status":"ok"}` all healthy · `200 {"status":"degraded"}` one supplier down · `503 {"status":"down"}` Redis/Temporal down or both suppliers down.

### Mock suppliers
`GET /supplierA/hotels?city=delhi`, `GET /supplierB/hotels?city=delhi` — static data with overlapping names (Holtin, Radison, Taj Palace, Ibis Central; cities: `delhi`, `mumbai`).

### Simulating a supplier outage
```bash
curl -X POST localhost:3000/admin/suppliers/a/down   # A returns 503
curl "localhost:3000/api/hotels?city=delhi"           # B-only results + X-Degraded-Suppliers header
curl -X POST localhost:3000/admin/suppliers/a/up
```
Or start with `SUPPLIER_A_DOWN=true` / `SUPPLIER_B_DOWN=true`.

## Postman
Import `postman/hotel-offer-orchestrator.postman_collection.json` (variable `baseUrl` = `http://localhost:3000`). Covers: overlap/dedupe checks, price filters (min/max/both/none), unknown city, validation errors, mock suppliers, health, and an ordered supplier-outage scenario (run the "Failure simulation" folder in order; it restores both suppliers at the end). All requests include test assertions, so the Collection Runner works.

## Project layout
```
src/
  server.js            Express bootstrap
  routes/              hotels.js, health.js
  suppliers/           mock data + routes
  temporal/            workflows.js, activities.js, worker.js, client.js
  dedupe.js            pure cheapest-offer selection
  hotelStore.js        Redis save + price-range filter
test/dedupe.test.js
Dockerfile · docker-compose.yml
```
