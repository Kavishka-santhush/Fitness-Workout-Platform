# Fitness & Workout Platform

Enterprise-grade full-stack fitness platform — a MyFitnessPal / Peloton / Strava alternative.

## Projects

| Folder     | Stack                                                                 |
|------------|-----------------------------------------------------------------------|
| `server/`  | Node.js + Express + Prisma (PostgreSQL) + Socket.io + Stripe + OpenRouter AI |
| `web/`     | Next.js 14 (App Router) + React Query + Tailwind + shadcn/ui + Framer Motion + Recharts + FullCalendar |
| `mobile/`  | React Native (Expo SDK 51) + Expo Router + Zustand + React Query      |

## Setup (manual — nothing is auto-run)

### 1. Database
```bash
createdb fitness_platform
cd server && npx prisma migrate deploy && npx prisma db seed
```

### 2. Server
```bash
cd server
npm install
cp .env.example .env   # fill in real values
npm run dev            # http://localhost:5000
```

### 3. Web
```bash
cd web
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

### 4. Mobile
```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

## Architecture

Clean architecture on the backend: **Routes → Controllers → Services → Prisma**.

- Auth is fully handled by **Clerk** (email, Google, Apple, Facebook OAuth); a Clerk webhook syncs users into PostgreSQL.
- File uploads use **Multer local storage** (`server/uploads/`).
- Real-time features (live classes, challenges, leaderboards, notifications, messaging) run over **Socket.io** on the same HTTP server.
- AI features route through **OpenRouter** with per-user usage quotas (3 req/day free, unlimited premium).
- Payments: **Stripe** subscriptions, program purchases, session bookings, Stripe Connect payouts for trainers.
- PDFs (certificates, reports, grocery lists) generated with **Puppeteer**.
- Search uses PostgreSQL full-text search with `pg_trgm`.
