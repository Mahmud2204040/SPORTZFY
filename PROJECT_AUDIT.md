# SPORTZFY mobile MVP audit and traceability

Date: 18 September 2026. Baseline: commit `c12d5ff`. This is a working audit; update status and evidence after each implementation increment. The five source documents in `E:\vs code\fuck\sportzfy_webapp\docs` describe a proposed web MVP. The approved delivery change is an Android-first Expo MVP with demo payments. Web hosting and browser breakpoint gates are superseded by native build and device checks.

Status: **tested** = verified by a recorded test or live API check; **implemented** = code exists but acceptance is not verified; **blocked** = required behavior is missing or wrong; **deferred** = explicitly outside the agreed mobile MVP. These labels do not imply release readiness.

## Baseline verification

- Backend: 26 tests pass; direct `next build` passes. The normal `npm run build` hit a Windows Prisma engine file lock during `prisma generate`, so that command remains unverified.
- Expo Android JS export passes. `expo install --check` fails for AsyncStorage, expo-location, expo-modules-core, and react-native-svg installed-version mismatches.
- No Android emulator/physical device was attached. TalkBack, keyboard, small-device screenshots, native build, and full end-to-end journeys: **not run**.
- No Prisma migrations directory, frontend Jest/React Native Testing Library suite, or CI workflow exists at baseline.
- Live read-only API checks found public match phone fields, ignored turf date/available-only/limit filters, and a non-paginated player booking list.

## Highest-risk defects

1. **Critical privacy:** public match list/detail returns host phone and applicant phone/profile (`backend/app/api/v1/matches/route.ts`, `[id]/route.ts`).
2. **High discovery trust:** turf cards always say “Available Today”; date/availability filters do not reach the server, and `/turfs` ignores `limit` (`src/components/TurfCard.js`, `src/screens/customer/ExploreScreen.js`, `backend/app/api/v1/turfs/route.ts`).
3. **High booking:** player history misclassifies completed/cancelled records, has no detail navigation, and does not refresh on focus. Confirmation replay for a consumed hold returns an error instead of the owned booking (`BookingContext.js`, `BookingsScreen.js`, booking API).
4. **High schedule:** availability uses hard-coded hours rather than stored `AvailabilityRule` records (`backend/app/api/v1/turfs/[id]/availability/route.ts`).
5. **High moderation:** rejection has no recorded reason or audit event; an approved venue edit currently unlists the live venue while pending (`backend/app/api/v1/admin/turfs/[id]/review/route.ts`, owner PATCH).

## Functional requirement traceability

| ID | Status | Evidence / remaining work |
|---|---|---|
| FR-AUTH-01 | implemented | Register API and mobile form; complete validation/E2E pending. |
| FR-AUTH-02 | implemented | Login/logout/session hydration; device E2E pending. |
| FR-AUTH-03 | implemented | API role guards exist; complete route matrix pending. |
| FR-AUTH-04 | implemented | Owner/booking guards exist; complete cross-account tests pending. |
| FR-AUTH-05 | tested | Invalid login responds generically in backend tests. |
| FR-AUTH-06 | deferred | Email/password recovery requires configured outbound email. |
| FR-TURF-01 | tested | Public turf API queries approved venues. |
| FR-TURF-02 | implemented | Name/area search exists; mobile combined-filter checks pending. |
| FR-TURF-03 | blocked | Date, availability, amenities and quote-based price filtering incomplete. |
| FR-TURF-04 | blocked | Cards assert availability without server summary. |
| FR-TURF-05 | implemented | Detail and slots exist; gallery/amenities/date range incomplete. |
| FR-TURF-06 | tested | Public detail/search exclude unapproved venues in API checks. |
| FR-TURF-07 | implemented | Local filter state exists; return/scroll verification pending. |
| FR-BOOK-01 | blocked | Availability ignores recurring owner rules. |
| FR-BOOK-02 | tested | Authenticated hold acquisition covered by backend tests. |
| FR-BOOK-03 | tested | Serializable collision tests pass; database integrity review remains. |
| FR-BOOK-04 | tested | Server expiry is enforced in backend test. |
| FR-BOOK-05 | blocked | Checkout omits cancellation terms and changed-quote confirmation. |
| FR-BOOK-06 | blocked | At most one booking via hold relation, but consumed-hold replay does not return booking. |
| FR-BOOK-07 | blocked | History status normalization and pagination incomplete; expired holds are not bookings. |
| FR-BOOK-08 | blocked | No persistent mobile booking-details navigation. |
| FR-BOOK-09 | blocked | No cancellation request/status flow. |
| FR-BOOK-10 | implemented | Owner focused polling exists; player detail refresh is incomplete. |
| FR-BOOK-11 | blocked | Expiry/failure recovery and response reconciliation incomplete. |
| FR-PAY-01 | blocked | Payment logic is embedded in booking route, not a provider-neutral adapter. |
| FR-PAY-02 | implemented | Demo payment attempt is recorded. |
| FR-PAY-03 | tested | Held server price is used, not client price. |
| FR-PAY-04 | blocked | Repeated confirmation does not return the same result. |
| FR-PAY-05 | blocked | Checkout says demo, confirmation still says “Total Paid”; server emits QR verification claim. |
| FR-PAY-06 | implemented | No production payment provider is active. |
| FR-OWN-01 | blocked | Mobile cannot create a draft venue. |
| FR-OWN-02 | tested | Owner edit ownership guard verified. |
| FR-OWN-03 | blocked | Mobile editor lacks image, format and operating-rule management. |
| FR-OWN-04 | blocked | No draft submit journey or reviewed revision workflow. |
| FR-OWN-05 | blocked | No recurring schedule/rate editor. |
| FR-OWN-06 | blocked | Inventory block exists; persistent walk-in booking does not. |
| FR-OWN-07 | implemented | Owner booking list exists; persistent detail view pending. |
| FR-OWN-08 | implemented | Basic demo metrics exist; occupancy unavailable. |
| FR-ADM-01 | tested | Pending review queue API and UI exist. |
| FR-ADM-02 | blocked | Decisions work, but rejection reason is absent. |
| FR-ADM-03 | blocked | No auditable decision record. |
| FR-ADM-04 | blocked | No mobile user/booking oversight. |
| FR-ADM-05 | implemented | Admin API guards exist; complete role matrix pending. |
| FR-ADM-06 | implemented | Review uses status changes. |
| FR-MATCH-01 | blocked | Create flow uses raw ISO entry and lacks safe area/booked-turf choice. |
| FR-MATCH-02 | blocked | Public list/detail exposes private phone data. |
| FR-MATCH-03 | implemented | Join-request endpoint and UI exist. |
| FR-MATCH-04 | implemented | Host accept/reject endpoints and UI exist. |
| FR-MATCH-05 | tested | Capacity decision tests pass. |
| FR-MATCH-06 | blocked | No host close-post action. |
| FR-COM-01 | blocked | Validation and recoverable form errors are inconsistent. |
| FR-COM-02 | blocked | Several screens conflate empty and error states. |
| FR-COM-03 | blocked | Some player screens use device timezone instead of Asia/Dhaka. |
| FR-COM-04 | blocked | Demo “paid/verified” wording and seeded data provenance are inconsistent. |

## Non-functional requirement traceability

| ID | Status | Evidence / remaining work |
|---|---|---|
| NFR-SEC-01 | implemented | Server guards exist; authorization matrix pending. |
| NFR-SEC-02 | implemented | Bcrypt used; legacy plaintext migration path remains to review. |
| NFR-SEC-03 | implemented | Secrets are server-side; secret-scan gate pending. |
| NFR-SEC-04 | blocked | Cookie mutation CSRF/CORS policy needs verification and tightening. |
| NFR-SEC-05 | blocked | Input validation is inconsistent across route handlers. |
| NFR-SEC-06 | blocked | No auth/mutation rate limiter found. |
| NFR-SEC-07 | implemented | Logging review and automated redaction checks pending. |
| NFR-SEC-08 | blocked | Public match API exposes contact fields. |
| NFR-REL-01 | tested | Booking concurrency tests pass; broader interval/DB constraint review pending. |
| NFR-REL-02 | blocked | Confirmation replay contract incomplete. |
| NFR-REL-03 | implemented | No external production provider; explicit failure-state tests pending. |
| NFR-REL-04 | blocked | No checked-in Prisma migrations or clean-db rehearsal. |
| NFR-PERF-01 | deferred | Core Web Vitals are a superseded web-only gate. |
| NFR-PERF-02 | blocked | No representative-load API performance evidence. |
| NFR-PERF-03 | blocked | Mobile remote image sizing/cache behavior not verified. |
| NFR-PERF-04 | blocked | Turf, match and player booking collections lack bounded cursor pagination. |
| NFR-A11Y-01 | deferred | Web keyboard requirement replaced by native keyboard/TalkBack acceptance. |
| NFR-A11Y-02 | blocked | Touch targets/labels incomplete; native audit not run. |
| NFR-A11Y-03 | implemented | Some status labels exist; full contrast/state audit pending. |
| NFR-A11Y-04 | blocked | Long forms lack field-linked error summaries. |
| NFR-A11Y-05 | blocked | Native accessibility verification not run. |
| NFR-A11Y-06 | deferred | CSS-pixel web gate replaced by small Android layout checks. |
| NFR-MNT-01 | implemented | Core rules mostly server-side; client-only filter behavior remains. |
| NFR-MNT-02 | implemented | Versioned `/api/v1` exists; contract consistency pending. |
| NFR-MNT-03 | blocked | No frontend typecheck/lint/test CI gate. |
| NFR-MNT-04 | blocked | Environment validation at startup/build not established. |
| NFR-MNT-05 | blocked | Mobile architecture decisions and tradeoffs need durable record. |

## Release decision

**Not release-ready.** Required first gates: remove public personal-data exposure, make discovery/booking state truthful, implement idempotent booking and owner schedule/moderation records, align native dependencies, then pass migration, component, Android device and accessibility evidence. Production payments, chat, app-store submission and web redesign remain deferred by the approved mobile scope.

## Implementation progress — 19 September 2026

The audit above is the original baseline. The following work has since been implemented in the working tree:

- **Foundation/security:** typed collection adapter contracts, account-data clearing, guest destination restoration, input validation, bearer-token enforcement, CORS allow-listing, auth rate limiting, session-secret handling, and Prisma migration files.
- **Discovery:** Dhaka date handling, manual location persistence, debounced and cursor-paginated search, server-side filters, truthful availability states, authoritative schedule fallback, quote metadata, and AI Price Guide explanations.
- **Booking:** server-priced demo holds, idempotent confirmation replay, booking detail, cancellation with reason/audit record, expiry/background reconciliation, normalized history, and QR/payment claims removed from the mobile flow.
- **Owner/admin:** draft and revision workflow, pending-review visibility, admin approve/reject with required reason and audit event, schedule/rate editing, authoritative slot inventory, collision-safe walk-in blocks, and refresh after mutations.
- **Matches and UX:** privacy-safe match responses, close-match endpoint, Dhaka date/time inputs, duplicate-action guards, shared loading/error/retry states, and booking/match navigation improvements.
- **Verification completed:** backend and frontend typechecks, mobile lint (zero warnings), backend API lint (zero errors), backend tests (28/28), frontend tests (4/4), Expo dependency check, Android JavaScript export, and normal backend build passed.
- **Latest additions:** admin user/booking oversight, owner venue gallery URL editing with revision review, approved schedule revisions, owner aggregate metrics, safe read-only database reconnection, combined-filter pagination correction, and CI database/API smoke workflow.

## Remaining release gates

- Root frontend lint has zero errors/warnings. Backend API lint has zero errors and 10 unused-variable warnings. Full backend lint has 16 errors in the superseded web UI, seed, simulator and concurrency helper.
- Rehearse migrations against a clean database and deploy the new schema; configure a production `SESSION_SECRET` and production CORS origins. The local Docker daemon is unavailable. The checked-in CI job will attempt the clean rehearsal after push.
- Execute Android emulator and physical-device journeys, including TalkBack, small-phone layouts, keyboard/back behavior, background/foreground, booking conflicts, owner revision review, and admin moderation. Capture actual results/screenshots.
- Add broader integration coverage for ownership, revisions, cancellation, pagination, rate limiting, and concurrency; review remote database reliability observed during the test run.
- Gallery editing currently accepts image URLs. A storage provider is required for direct photo upload; verify owner insights with representative booking history.
- Keep production payments, refunds, chat, app-store submission, web redesign, and iOS native verification deferred.

**Current release decision:** implementation is substantially ahead of the baseline audit, but the app is still **not release-ready** until the environment, clean migration, lint, and real Android/accessibility gates pass.

## Current requirement status overrides

These entries supersede the baseline rows above. IDs not listed retain their baseline status and evidence. `implemented` means code is present; the pending API smoke and device run are not counted as tests.

| ID | Current status | Code evidence / remaining verification |
|---|---|---|
| FR-TURF-03 | implemented | `backend/app/api/v1/turfs/route.ts` handles combined date, time, format, amenity, quote-price and availability filters; CI API smoke pending. |
| FR-TURF-04 | implemented | `src/components/TurfCard.js` uses selected-date server summary and unknown status; component test passes. |
| FR-TURF-05 | implemented | Venue detail has 14 Dhaka dates, slots, gallery, amenities and reviews; device layout pending. |
| FR-BOOK-01 | tested | `backend/lib/schedule.ts` uses owner rules and legacy fallback; after-midnight unit test passes. |
| FR-BOOK-05 | implemented | Checkout reconciles changed quote and shows demo/cancellation terms; device test pending. |
| FR-BOOK-06 | implemented | Unique hold booking and replay handling in booking API; CI API smoke pending. |
| FR-BOOK-07 | implemented | Paginated booking history normalizes statuses; device test pending. |
| FR-BOOK-08 | implemented | Persistent booking detail route and screen; device test pending. |
| FR-BOOK-09 | implemented | Future booking cancellation records reason/actor; CI API smoke pending. |
| FR-BOOK-10 | implemented | Player/owner focused and foreground availability refresh; device test pending. |
| FR-BOOK-11 | implemented | Checkout reconciles expiry and lost response without replaying database writes; failure test pending. |
| FR-PAY-01 | implemented | Provider-neutral demo capture interface in `backend/lib/payment.ts`. |
| FR-PAY-04 | implemented | Consumed hold/idempotency replay returns owned booking; CI API smoke pending. |
| FR-PAY-05 | implemented | Mobile flow and API label demo/no charge and suppress QR; web copy remains outside mobile release. |
| FR-OWN-01 | implemented | Mobile draft creation and owner API. |
| FR-OWN-03 | implemented | Owner image URL/gallery, format, amenities and schedule editors; direct upload needs storage provider. |
| FR-OWN-04 | implemented | Draft submit and approved revision review; CI API smoke pending. |
| FR-OWN-05 | implemented | Weekly rules/rates editor; approved venue changes await admin review. |
| FR-OWN-06 | implemented | Collision-safe walk-in inventory record; device test pending. |
| FR-OWN-08 | implemented | Owner aggregates use recorded bookings; occupancy stays unavailable rather than invented. |
| FR-ADM-02 | implemented | Approve/reject confirmation and required rejection reason. |
| FR-ADM-03 | implemented | Moderation event/revision audit tables and API. |
| FR-ADM-04 | implemented | Read-only paginated users/bookings screen and admin endpoints. |
| FR-MATCH-01 | implemented | Dhaka date/time inputs and validation; native usability test pending. |
| FR-MATCH-02 | implemented | Public match responses project safe fields; CI privacy smoke pending. |
| FR-MATCH-06 | implemented | Host close-post endpoint and mobile action. |
| FR-COM-01 | implemented | Touched forms validate input and return recoverable errors; full device review pending. |
| FR-COM-02 | implemented | Core player/owner/admin screens separate loading, empty and error states. |
| FR-COM-03 | implemented | Touched mobile date/time views format Asia/Dhaka; midnight device check pending. |
| FR-COM-04 | implemented | Mobile demo wording and sample-data labels; remaining web wording is outside mobile gate. |
| NFR-SEC-04 | implemented | API CORS origin allow-list and bearer session handling; deployed-origin verification pending. |
| NFR-SEC-05 | implemented | Touched auth, owner, booking and match inputs validate; complete route matrix pending. |
| NFR-SEC-06 | implemented | Database-backed auth rate limiter; migration and rate-limit integration test pending. |
| NFR-SEC-08 | implemented | Public match phone/profile fields removed; CI privacy smoke pending. |
| NFR-REL-02 | implemented | Idempotent booking replay in API; CI smoke pending. |
| NFR-REL-04 | blocked | Migrations checked in; clean database rehearsal pending because local Docker is unavailable. |
| NFR-PERF-04 | implemented | Public turf/match and player booking collections use bounded cursor pagination. |
| NFR-MNT-03 | implemented | Mobile typecheck/lint/Jest and CI workflow added; remote CI run pending. |
| NFR-MNT-04 | blocked | Production session secret/CORS must be configured and checked in deployment. |
| NFR-MNT-05 | implemented | This audit and CI workflow record mobile scope and release decisions. |

## Migration and release record

- The connected Neon `Sportzfy` database already has application tables but has **no recorded Prisma migrations**. `prisma migrate status` reports both migrations pending. Do not run the baseline migration against those existing tables. After a backup and environment identification, mark `202609180001_baseline` applied, then deploy `202609180002_mobile_mvp`.
- Local clean database rehearsal: **not run**. Docker Desktop daemon and local PostgreSQL server are unavailable. CI's PostgreSQL service, migration, seed and API smoke jobs have been authored but have not yet reported a run.
- Android JavaScript bundle: **passed**. Native APK/emulator/physical-device tests and screenshots: **not run**; Android SDK/ADB is absent on this host.
- Expo SDK 51 dependency check, backend build, backend tests 28/28, mobile tests 4/4, and both typechecks: **passed**. Full backend lint: **failed** on web/seed/helper files; mobile lint and backend API lint: **passed**.
