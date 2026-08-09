# EZBZ Marketplace

Multi-vendor liquidation and auction e-commerce platform. This repo currently implements **Phase 1 — Core Storefront**: product catalog, product detail pages (Deal Score™, Amazon price compare, video walkarounds), cart, stubbed checkout, buyer auth, and a basic admin panel.

See `EZBZ_Marketplace_Project_Brief.md` for the full product brief and roadmap, and `.claude/plans/` for the Phase 1 implementation plan.

## Stack

- Next.js 16 (App Router, Turbopack)
- PostgreSQL via [Neon](https://neon.tech), accessed through Prisma 7 with the `@prisma/adapter-neon` driver adapter
- Auth.js v5 (Credentials provider, JWT sessions)
- Tailwind CSS v4 + shadcn/ui (Base UI primitives), navy/gold theme
- Zod for validation

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Neon Postgres project** at [neon.tech](https://neon.tech), then copy both connection strings from the dashboard (Connection Details):
   - Pooled connection → `DATABASE_URL`
   - Direct/unpooled connection → `DIRECT_URL` (required for `prisma migrate`, since the migration engine needs prepared-statement support that pooled connections don't provide)

3. **Copy `.env.example` to `.env`** and fill in `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET` (generate with `npx auth secret` or `openssl rand -base64 32`).

4. **Run the migration and seed the demo catalog:**

   ```bash
   npx prisma migrate dev
   npx tsx prisma/seed.ts
   ```

   The seed script creates 10 demo listings across 5 categories, and a bootstrap admin account:

   - Email: `admin@ezbz.dev`
   - Password: `ChangeMe123!`

   **Change this password** (or delete/repoint the seeded admin) before deploying anywhere other than local dev — there's no other way to promote the first admin, since the admin panel itself requires an existing admin to access.

5. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000).

## Project structure

- `app/` — routes (App Router). Notable groups: `(auth)/` for login/signup, `admin/` for the admin panel (gated by `role === "ADMIN"`), `account/orders/` for buyer order history.
- `lib/` — data access (`prisma.ts`, `listings.ts`, `cart.ts`), business logic (`deal-score.ts`), auth (`auth.ts`, `auth/dal.ts`), and Zod schemas (`validation/`).
- `components/` — shared UI, including `components/ui/` (shadcn primitives).
- `prisma/schema.prisma` — data model. `prisma/seed.ts` — demo data.
- `proxy.ts` — optimistic auth redirect (Next.js 16's replacement for `middleware.ts`). Real authorization happens in `lib/auth/dal.ts` and inside every Server Action, not here.

## Known Phase 1 limitations

- **No real payments.** Checkout creates a real `Order` record with `paymentStatus: TEST_MODE` and decrements inventory, but never charges a card. Payment processing is Phase 2.
- **No seller accounts yet.** All listings are managed by admins; the `Listing.sellerId` column exists but is always null until Phase 3 multi-vendor support.
- **Photos/videos are URLs only** — the admin panel accepts image and video URLs (assumed hosted elsewhere), not file uploads. There's no object storage integration in Phase 1.
- **First admin is seed-only.** There's no self-serve way to become an admin; use `prisma/seed.ts` or flip a user's `role` to `ADMIN` via `npx prisma studio`.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npx prisma studio` | Browse/edit the database |
| `npx prisma migrate dev` | Create and apply a migration |
| `npx tsx prisma/seed.ts` | (Re-)seed demo data |
