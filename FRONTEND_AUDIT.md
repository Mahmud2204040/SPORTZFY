# SPORTZFY frontend audit

Date: 17 September 2026

## Scope and evidence

Reviewed the Expo frontend, shared components, API adapters, authentication/navigation state, customer booking flow, and selected owner/admin screens. Inspected the Next.js homepage and login page in a live browser, plus venue details at a 390 × 844 viewport. Native mobile findings are from source inspection, not a device run. Authenticated checkout and dashboard interactions were not executed. No real booking or payment was submitted.

The initial preview could not reach its database/fonts inside the sandbox. A preview outside the sandbox loaded the homepage successfully. This environmental failure is not evidence that the deployed site is down. Runtime preview artifacts may have been generated; no application source was edited for this audit.

## Assessment

The web frontend has a recognizable green identity, clear venue imagery areas, responsive cards, useful slot status labels, and a visible booking summary after selection. The native app has reusable theme tokens and a sensible five-tab customer structure. These are useful foundations.

The immediate priority is frontend correctness: several mobile API response contracts do not match their consumers. After repairing that flow, the largest UX gains will come from placing search and slot selection earlier, making pricing understandable, and separating errors from empty results.

Priorities: P0 = prevents a core journey; P1 = significant usability or trust problem; P2 = polish, scalability, or secondary workflow improvement. These are implementation priorities, not a measured usability score.

## Findings and recommended changes

### F01 — P0: Mobile API response contracts break the booking journey

Evidence: `src/api/turfs.js` returns `res.data`, but `ExploreScreen.js` checks `res.data` again; `TurfDetailsScreen.js` checks `res.data` and `res.data.slots`. The helper already returns the array, turf object, or availability object. The shelves endpoint instead returns top-level `shelves`, while its helper returns nonexistent `res.data`.

The same double-unwrapping exists between `src/api/holds.js` and `BookingScreen.js`, and between `src/api/bookings.js` and both checkout and `BookingContext.js`. A successful hold can be created without the screen storing its ID or expiry. A successful booking response can fail to open the confirmation UI.

Improve: choose one documented adapter return shape, normalize responses there, and type the models shared with screens. Validate discovery → real venue → real availability → hold → confirmation → booking history using a controlled test environment. Do this before redesigning these screens.

### F02 — P1: Search and filter controls do not express the actual query

Evidence: `ExploreScreen.js:59` supplies `q`; `src/api/turfs.js` accepts `search` and sends `search`; the endpoint expects `q`. Location options contain areas such as “GEC, Chattogram” but are sent as exact city filters. “Football” is sent as a pitch format, while venue formats are values such as `5v5` and `7v7`. The date selection increases the filter badge but is never applied. Home sends `shelfId` to Explore, which does not consume it.

Improve: separate city, area, sport, format, and date fields. Wire every visible filter through the adapter to a supported query. Add removable active-filter chips, a clear-all action, and a result count. Debounce text input and prevent older responses from replacing newer results.

Acceptance: an impossible search shows zero results; changing date changes availability; opening a named shelf retains that context.

### F03 — P1: Demo content conceals failures and empty states

Evidence: `ExploreScreen.js:94` substitutes mock turfs whenever the real array is empty. Home also uses demo shelves when no shelves are present. Booking state starts with seed bookings. Owner dashboard falls back to mock statistics and venue data.

Improve: use separate loading, loaded-empty, error, and stale-cache states. Provide inline Retry actions. Keep demo fixtures behind an explicit demo mode. Show “Unable to load” for unavailable metrics rather than sample revenue or zero values.

### F04 — P1: Booking history is incomplete and can become stale

Evidence: `BookingContext.js:38` assigns the same raw ISO timestamp to both date and time. It converts only `CONFIRMED` to lowercase `upcoming`; `COMPLETED` and `CANCELLED` stay uppercase and miss the history tabs. `BookingsScreen.js` refreshes on mount only and passes no action to its touchable booking cards. Checkout does not update the shared booking list. The provider does not clear bookings on account changes.

Improve: normalize all statuses, format venue-local dates and time ranges, refresh on screen focus, and clear account-specific state on logout. Open a booking-details screen with the pass, reference, venue directions, and available support actions. Add “Find a turf” to the empty state.

### F05 — P1: Checkout recovery needs explicit states

Evidence: the native countdown continues after success because its effect does not depend on the success state. Once the response-contract issue is fixed, it can report expiry over the success modal. `SuccessModal.js` has `maxHeight: '85%'` without scrolling and truncates references to one line. Web checkout treats failed hold loading as expiry and decrements a counter rather than recalculating from the expiry timestamp.

Improve: model reserving, reserved, confirming, confirmed, expired, and network-error states separately. Stop expiry handling after confirmation. Reconcile remaining time after backgrounding. Make confirmation content scrollable and references copyable. Offer an explicit “Choose another slot” recovery path. Clearly identify payment simulation wherever it is exposed to users.

### F06 — P1: Pricing presentation gives conflicting signals

Observed in the web preview: “Best Deals & Off-Peak Savers” contained surge-priced cards. Cards struck through a lower base price while displaying a higher current price. The venue details page states a fixed +৳150 peak surcharge while slot quotes vary dynamically. The homepage's “Featured Slot Tonight” text is hardcoded.

Improve: show a date/time-specific quote and one clear payable total. Use crossed-out prices only for a genuine reduction. Rename the shelf “Budget-friendly venues” unless it contains actual discounted slots. Replace static pricing and availability promises with current data. Replace “ML Multiplier,” “GPS Haversine,” and “atomic hold” with “Peak-time price,” “Distance from your selected location,” and “Reserved for five minutes.”

Evidence: `backend/components/FoodpandaDiscoveryShelves.tsx:336`, `backend/app/turfs/[id]/page.tsx:337`, `backend/app/page.tsx:75`, and `src/screens/customer/BookingScreen.js:215`.

### F07 — P1: Discovery makes users scroll before they can act

Observed: the web homepage places the catalog's search controls after the hero and several discovery carousels. At phone width, venue details place the overview, amenities, pricing notes, and policy ahead of slot selection. The header city selection changes local navbar state only; it does not filter the catalog or shelves.

Improve: put city/area, date, and sport search directly under the headline. Use one shared location selection. Follow search with available venues, then optional discovery shelves. On venue details, add a prominent “See available slots” anchor before the overview. Expand web date selection beyond Today/Tomorrow to match the supported booking window.

### F08 — P1: Accessibility needs component-level work

Evidence: no explicit accessibility labels, roles, or selected/disabled states were found in the native source search. Web login labels lack input associations; catalog search relies on a placeholder. Selected filter buttons do not expose pressed state. Slot pricing/status badges use 9px native text. The shared disabled primary button keeps white content on a light gray background.

Calculated token contrast: native muted gray `#9A9A9A` against white is approximately 2.81:1; web accent green `#10B981` against white is approximately 2.54:1. These combinations are difficult to read for small essential text. This is not a full accessibility conformance audit.

Improve: label inputs and icon controls; expose selection, busy, and disabled states; provide visible keyboard focus; use readable disabled colors; enlarge essential metadata. Add modal focus management and reduced-motion behavior. Verify with keyboard navigation, a screen reader, larger system text, and small phones.

### F09 — P2: Visual identity and information hierarchy differ across platforms

Evidence: mobile uses `#1B8A3A`, a football mark, and system typography; web uses emerald/forest colors, a shield mark, and Bebas Neue/Barlow. Cards combine uppercase headings, multiple badges, emojis, status colors, and secondary labels. One observed venue card used a mountain photo, which does not establish what the pitch looks like.

Improve: establish shared brand colors, logo, semantic status colors, radii, and spacing. Keep expressive condensed headings for short titles; use readable body typography for details. Prioritize venue name, locality, format, next available time, and price. Use real venue photos or clearly identified placeholders. Reserve strong color for the main action and meaningful status.

### F10 — P2: Authentication and profile flows need completion

Evidence: native navigation gates all discovery behind login and does not use `initialLoading` to render a session-restoration screen. Login exposes demo player/owner/admin shortcuts. Mobile profile includes disabled Settings, Help, and About rows. The owner app reuses a profile action that navigates to `Matches`, which is absent from its stack/tab routes.

Improve: consider guest browsing with sign-in at reservation; preserve the selected venue/slot through authentication. Add a session-loading shell and password recovery. Limit demo shortcuts to demo builds. Make profile actions role-aware. Provide working support access, and hide unfinished actions or explain their availability.

### F11 — P2: Loading, error resilience, and list performance need a common pattern

Evidence: native Explore and booking lists render all items inside ScrollViews. Fetch effects generally lack cancellation or response-order guards. Web discovery silently disappears when data loading fails. There are no custom route-level `loading`, `error`, or `not-found` files in the inspected Next.js app tree.

Improve: virtualize growing native lists, add pagination where necessary, keep skeleton dimensions stable, and retain useful content during refresh. Provide local retry states and route-level recovery screens. Give images a fallback and responsive size strategy. Measure interaction speed and loading on a slow mobile connection before setting performance targets.

## Suggested implementation sequence

1. **Restore the customer journey:** F01 response contracts; F02 real filtering; F03 truthful data states; F04 booking normalization and refresh; F05 checkout lifecycle.
2. **Make choosing and booking easier:** shared location, search-first homepage, earlier slot access, clear quotes, complete booking details.
3. **Polish and accessibility:** common design tokens, typography, authentic imagery, labeled controls, focus behavior, readable disabled states, responsive modals.
4. **Validate representative journeys:** guest discovery, zero-result search, network failure/retry, date switching during slow requests, hold conflict/expiry, returning from background, booking confirmation/history, account switching, and owner profile navigation.

The first release gate should be a reliable booking journey with honest states. Visual changes should then be checked at narrow mobile, tablet, and desktop widths, including long venue names and enlarged text.
