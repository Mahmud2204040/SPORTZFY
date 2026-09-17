# Master Implementation Plan: Sportzfy Mobile App (React Native Expo)

## 1. Context & Objective

The `SPORTZFY` repository contains a React Native Expo UI prototype for a sports turf booking platform in Bangladesh. Currently, the mobile app is backed entirely by static JavaScript mock data with in-memory state that resets on reload.

In contrast, the `sportzfy_webapp/sportzfy-web` repository (used strictly as a **read-only architectural reference**) implements a production-grade backend with:
- **PostgreSQL (Neon) + Prisma ORM** with 20 authentic venues and 5,000+ bookings.
- **5-Minute Atomic Holds** via `SERIALIZABLE` database transactions (`/api/v1/holds`).
- **Sub-millisecond In-Process ML Dynamic Pricing Engine** with BST (UTC+6) temporal features and `[0.80x, 1.30x]` safety clamps.
- **HMAC-SHA256 Session Crypto** with 7-day TTL and role-based access control (`CUSTOMER`, `OWNER`, `ADMIN`).
- **Community Squad Matchmaking** for 7v7/5v5 team recruitment, role selection, and captain roster approvals.
- **Curated Discovery Shelves** (Foodpanda-style carousels) with Haversine GPS sorting.

**Goal:** Transform the `SPORTZFY` React Native Expo mobile application from a static prototype into a feature-complete mobile client that connects directly to the local/LAN Next.js API server (`sportzfy-web`), achieving feature parity while preserving the established ES6+ JavaScript structure and mobile design system.

---

## 2. Architectural Design & System Decisions

### 2.1 Backend Connection & Networking
* **Target Endpoint:** Local / LAN Next.js API server (`http://<YOUR_LAN_IP>:3000/api/v1` or `http://10.0.2.2:3000/api/v1` on Android emulator).
* **API Config Module (`src/api/config.js`):** Centralized baseURL configuration with environment variable support (`EXPO_PUBLIC_API_URL`) and automatic device host resolution.
* **HTTP Client (`src/api/client.js`):** Lightweight fetch wrapper handling:
  - Cookie/Bearer session header attachment from `@react-native-async-storage/async-storage`.
  - JSON serialization/deserialization.
  - Standardized error handling matching Next.js error shapes `{ error: { code, message } }`.
  - Automatic session expiration detection (401 redirection to Login).

### 2.2 Persistence & Session Lifecycle
* **Package:** `@react-native-async-storage/async-storage`
* **Session Storage:** Persist `sportzfy_session` token and serialized `user` profile.
* **App Boot:** `AuthContext` hydrates session from storage on launch, verifying validity with `/api/v1/auth/me`.

### 2.3 Concurrency & 5-Minute Atomic Checkout Lock Flow
* **Step 1 (Select Slot):** Player picks date and slot on `TurfDetailsScreen`.
* **Step 2 (Hold Request):** Client issues `POST /api/v1/holds { turfId, startTime, endTime }`.
* **Step 3 (Lock Acquired):** On HTTP 201, client receives `{ id: holdId, price, expiresAt }` and navigates to `BookingScreen` (or new `CheckoutScreen`).
* **Step 4 (Live Countdown):** Active 5:00 countdown timer with visual progress.
* **Step 5 (Confirmation):** Player selects bKash/Nagad/Card and submits `POST /api/v1/bookings { holdId, paymentMethod, accountNumber }`.
* **Step 6 (Ticket Generation):** On confirmation, displays unique reference code (`SPZ-2026-...`) and renders QR pass.

### 2.4 Community Squad Matchmaking (5th Navigation Tab)
* **Tab Navigation:** Add `"Matches"` to `BottomTabs` (Customer navigation).
* **Match Feed:** Browse open matches from `GET /api/v1/matches` with format/role filters.
* **Match Detail & Lineup:** Renders match overview, turf details, captain jersey card, confirmed roster, and open spot placeholders.
* **Join Squad:** Modal allowing player to select `preferredRole` (Goalkeeper, Defender, Midfielder, Striker) and submit `POST /api/v1/matches/:id/join`.
* **Captain Roster Controls:** If `hostUserId === currentUser.id`, renders applicant review cards with Accept/Decline actions calling `POST /api/v1/matches/:id/requests/:requestId/decision`.
* **Host Match:** Form to recruit squad members (`POST /api/v1/matches`).

---

## 3. Detailed File Modification & Creation Matrix

### New Files to Create in `SPORTZFY/`:
1. `src/api/config.js` — API base URL and environment resolution.
2. `src/api/client.js` — Core HTTP request handler with auth token injection.
3. `src/api/auth.js` — Auth API functions (`login`, `register`, `me`, `logout`).
4. `src/api/turfs.js` — Venue discovery (`getShelves`, `getTurfs`, `getTurfDetails`, `getAvailability`).
5. `src/api/holds.js` — Hold creation, inspection, and release (`createHold`, `getHold`, `deleteHold`).
6. `src/api/bookings.js` — Booking confirmation and user booking history (`confirmBooking`, `getMyBookings`).
7. `src/api/matches.js` — Matchmaking feed, creation, join requests, and captain decisions (`getMatches`, `getMatchById`, `createMatch`, `joinMatch`, `decideRequest`, `getMyMatches`).
8. `src/api/owner.js` — Owner KPIs, stats, and schedule management (`getOwnerStats`, `getBlockedIntervals`, `createBlockedInterval`, `deleteBlockedInterval`).
9. `src/screens/customer/MatchesScreen.js` — Squad matchmaking discovery feed and "My Squads" tab.
10. `src/screens/customer/MatchDetailScreen.js` — Squad roster, lineup, join modal, and captain approval dashboard.
11. `src/screens/customer/CreateMatchScreen.js` — Match host creation form.
12. `src/components/MatchCard.js` — Match listing card showing venue, time, open spots, and role badge.
13. `src/components/RosterPlayerCard.js` — Player card for squad lineups and applicant review.
14. `src/components/QRCodeView.js` — QR code generator/renderer for confirmed booking passes (using `react-native-qrcode-svg`).

### Existing Files to Modify in `SPORTZFY/`:
1. `package.json` — Add `@react-native-async-storage/async-storage`, `react-native-qrcode-svg`, `expo-location`.
2. `src/context/AuthContext.js` — Replace mock user generator with real API calls and AsyncStorage session hydration.
3. `src/context/BookingContext.js` — Connect to `/api/v1/bookings` for user history and active hold state tracking.
4. `src/navigation/BottomTabs.js` — Add "Matches" tab with football icon.
5. `src/navigation/MainStack.js` — Register `MatchDetailScreen` and `CreateMatchScreen`.
6. `src/screens/auth/LoginScreen.js` — Wire to `api/auth.js`, handle server validation errors, store session.
7. `src/screens/auth/SignUpScreen.js` — Wire to `api/auth.js`, validate passwords, redirect based on returned role.
8. `src/screens/customer/HomeScreen.js` — Connect to `GET /api/v1/turfs/shelves`, make SearchBar interactive, support dynamic prices.
9. `src/screens/customer/ExploreScreen.js` — Connect to `GET /api/v1/turfs` with query parameters (city, format, rating, price).
10. `src/screens/customer/TurfDetailsScreen.js` — Fetch live timetable from `GET /api/v1/turfs/:id/availability`, display ML demand badges (Surge / Off-Peak saver), initiate hold on "Book Now".
11. `src/screens/customer/BookingScreen.js` — Implement 5-minute countdown lock, hold expiration handling, confirm via `POST /api/v1/bookings`, display QR pass.
12. `src/screens/customer/BookingsScreen.js` — Fetch real bookings from `GET /api/v1/bookings`, render reference codes and QR view.
13. `src/screens/customer/ProfileScreen.js` — Wire settings/support/bookings actions, dynamic user stats, real logout.
14. `src/screens/owner/OwnerDashboardScreen.js` — Fetch real KPIs and upcoming reservations from `GET /api/v1/owner/stats`.
15. `src/screens/owner/OwnerTurfScreen.js` — **Fix one-way slot toggle bug**, connect slot blocking to `POST/DELETE /api/v1/owner/blocked-intervals`.
16. `src/screens/owner/OwnerBookingsScreen.js` — Fetch real revenue metrics and bookings grouped by status.

---

## 4. Phased Implementation Roadmap

### Phase 1: Foundation & Dependencies Setup
1. Install required packages in `SPORTZFY/`:
   - `@react-native-async-storage/async-storage`
   - `react-native-qrcode-svg`
   - `expo-location`
2. Create API client architecture (`src/api/config.js`, `src/api/client.js`).
3. Set up environment configuration with LAN IP detection.

### Phase 2: Authentication & Session Persistence
1. Implement `src/api/auth.js` (`/api/v1/auth/login`, `register`, `me`, `logout`).
2. Refactor `AuthContext.js` to persist session cookies/tokens in AsyncStorage.
3. Update `LoginScreen.js` and `SignUpScreen.js` with real validation and error toasts.
4. Verify role-based routing (Customer → `MainStack`, Owner → `OwnerStack`).

### Phase 3: Discovery & Live Venue Catalog
1. Implement `src/api/turfs.js` (`/api/v1/turfs/shelves`, `/api/v1/turfs`, `/api/v1/turfs/:id`).
2. Update `HomeScreen.js` to render dynamic Discovery Shelves (*Near You*, *Best Deals*, *Top Picks*).
3. Connect `ExploreScreen.js` and `FilterModal.js` to live venue filtering.
4. Wire `SearchBar` on Home to navigate to Explore with prefilled search text.

### Phase 4: Dynamic ML Availability & 5-Minute Atomic Holds
1. Connect `TurfDetailsScreen.js` to `GET /api/v1/turfs/:id/availability?date=...`.
2. Render dynamic pricing badges (`Off-Peak 20% OFF`, `Surge +15%`, `Standard Rate`) based on ML predictions.
3. Integrate `POST /api/v1/holds` to atomically lock the selected slot for 300 seconds.
4. Update `BookingScreen.js` to display active 5:00 countdown timer, handle hold expiry, and execute `POST /api/v1/bookings`.
5. Display confirmed match pass with dynamic QR code on `SuccessModal` and `BookingsScreen.js`.

### Phase 5: Community Squad Matchmaking (5th Tab)
1. Implement `src/api/matches.js` (`/api/v1/matches`, `/api/v1/matches/:id`, `join`, `decision`).
2. Create `MatchesScreen.js` with "All Matches" feed and "My Squads" dashboard.
3. Create `MatchDetailScreen.js` with tactical squad lineup, open spot indicators, and role selection modal.
4. Implement captain console allowing hosts to accept/reject applicant join requests.
5. Create `CreateMatchScreen.js` to let captains recruit players for booked slots.
6. Register screens in `BottomTabs.js` and `MainStack.js`.

### Phase 6: Owner Operations & Bug Fixes
1. Fix slot toggle bug in `OwnerTurfScreen.js` so tapping toggles between available and blocked.
2. Connect `OwnerTurfScreen.js` to `POST/DELETE /api/v1/owner/blocked-intervals`.
3. Connect `OwnerDashboardScreen.js` and `OwnerBookingsScreen.js` to `GET /api/v1/owner/stats`.
4. Fix profile menu items in `ProfileScreen.js`.

---

## 5. End-to-End Verification & Validation Plan

### 5.1 Verification Checklist
1. **Auth & Persistence:**
   - Log in as `player@sportzfy.com` (password: `player123`).
   - Reload app; verify user stays logged in without returning to LoginScreen.
   - Test log out and switch to owner account `owner@sportzfy.com`.
2. **Venue Discovery & Search:**
   - Verify 20 authentic venues load dynamically on Home and Explore tabs.
   - Verify search bar filters venues by city (Chattogram, Dhaka) and area.
3. **Dynamic ML Pricing & Availability:**
   - Select a venue on `TurfDetailsScreen`.
   - Verify evening slots (8 PM - 11 PM BST) display surge badge and +150 BDT surcharge.
   - Verify afternoon slots display off-peak saver discount.
4. **5-Minute Atomic Hold & Checkout:**
   - Select a slot and tap "Book Now".
   - Verify `Hold` row is created in DB and 5:00 countdown timer starts.
   - Confirm booking with bKash; verify HTTP 200/201 and generation of `SPZ-2026-...` ticket code with readable QR pass.
5. **Squad Matchmaking:**
   - Open "Matches" tab, browse open matches.
   - Apply for a squad with role "Goalkeeper"; verify pending status badge.
   - Switch to host account and accept the request; verify open spots decrement and player appears in confirmed roster.
6. **Owner Operations:**
   - Log in as Owner; verify KPI cards match live database stats.
   - Block a slot; verify it immediately shows as `BLOCKED` on customer availability timetable.
