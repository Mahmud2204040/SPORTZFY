# SPORTZFY

Android-first Expo mobile MVP with a Next.js `/api/v1` backend. The current checkout uses demo payments; no money is charged. The implementation and verification record is in [PROJECT_AUDIT.md](PROJECT_AUDIT.md).

## Local development

Use Node.js 20 and a PostgreSQL database. Copy `backend/.env.example` to `backend/.env`, then provide `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SESSION_SECRET` (at least 32 characters), and `CORS_ALLOWED_ORIGINS` for the mobile development origin. Neon runtime traffic uses its pooled hostname; migrations use the direct hostname. Install dependencies separately in the root and `backend` with `npm ci`.

For a **new, empty** database, run `npx prisma migrate deploy` and `npx prisma db seed` from `backend`, then `npm run dev`. The already populated Neon database needs a backup and baseline-aware migration; do not apply the baseline migration directly to existing tables. The exact deployment record is in `PROJECT_AUDIT.md`.

Start the mobile app from the root with `npm start`. The default Android emulator API address is `http://10.0.2.2:3000/api/v1`. For a physical Android device or deployed backend, set `EXPO_PUBLIC_API_URL` to the reachable server origin **without** `/api/v1` before bundling the app. Use HTTPS outside local development.

## Checks

From the root: `npm run typecheck`, `npm run lint`, `npm test -- --silent`, and `npx expo install --check`. From `backend`: `npx tsc --noEmit -p tsconfig.json`, `npm run lint:api`, `npm test`, and `npm run build`. The GitHub Actions `Mobile MVP checks` workflow runs these checks, clean database migration/seed, API smoke, Android bundle export and a debug APK build. The workflow artifact is for verification; by default its API address targets an Android emulator.

Production payment, refunds, chat, app-store submission, and web redesign are outside this MVP. Native device and accessibility results are tracked in `PROJECT_AUDIT.md`.
