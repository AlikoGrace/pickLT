# PickLT — Client Mobile App PRD
## Complete Product Requirements Document for Mobile Development

> **Purpose**: This document captures every piece of business logic, data model, API contract, user flow, and behavioral rule extracted from the existing PickLT web application. It is the single source of truth for building the client-facing mobile app that must integrate seamlessly with the same Appwrite backend.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Backend Infrastructure](#2-tech-stack--backend-infrastructure)
3. [Authentication System](#3-authentication-system)
4. [Global State — MoveSearch Context](#4-global-state--movesearch-context)
5. [Complete Move Type System](#5-complete-move-type-system)
6. [Instant Move Flow (Step-by-Step)](#6-instant-move-flow-step-by-step)
7. [Scheduled Move Flow (Step-by-Step)](#7-scheduled-move-flow-step-by-step)
8. [Move Preview & Submission](#8-move-preview--submission)
9. [Checkout & Payment](#9-checkout--payment)
10. [Move Details & Tracking](#10-move-details--tracking)
11. [My Moves — Move Management](#11-my-moves--move-management)
12. [Account Management](#12-account-management)
13. [Notifications System](#13-notifications-system)
14. [Review & Rating System](#14-review--rating-system)
15. [Inventory Catalog & Classification Algorithm](#15-inventory-catalog--classification-algorithm)
16. [Mover Discovery & Pricing](#16-mover-discovery--pricing)
17. [Maps Integration](#17-maps-integration)
18. [API Endpoints Reference](#18-api-endpoints-reference)
19. [Database Collections & Schemas](#19-database-collections--schemas)
20. [Real-Time Subscriptions](#20-real-time-subscriptions)
21. [Cloud Functions](#21-cloud-functions)
22. [Route Protection & Session Management](#22-route-protection--session-management)
23. [Environment Variables](#23-environment-variables)
24. [Business Rules & Edge Cases](#24-business-rules--edge-cases)
25. [Pricing Formula](#25-pricing-formula)

---

## 1. Project Overview

**PickLT** is an on-demand moving service platform (think Uber for moving). Clients can book a mover instantly or schedule a move in advance. The platform has two user types:

- **Client**: Books moves (this mobile app)
- **Mover**: Professional who accepts and executes moves (separate mover app)

### Core Value Proposition
- **Instant Move**: Client picks up items, photos, selects a nearby verified mover from a list, and the mover receives the job request immediately.
- **Scheduled Move**: Client goes through a detailed 7-step booking wizard, selects date/time, and the platform assigns a mover.

### Geographic Context
The app targets primarily **Germany** (EUR currency, VAT 19%, Haltverbot parking rules, German address conventions).

---

## 2. Tech Stack & Backend Infrastructure

### Backend (shared by web and mobile)
| Layer | Technology |
|---|---|
| Backend-as-a-Service | Appwrite Cloud (Frankfurt region) |
| Database | Appwrite Database |
| Auth | Appwrite Auth (Email/Password + Google OAuth + Phone OTP) |
| File Storage | Appwrite Storage |
| Real-time | Appwrite Realtime (WebSocket) |
| Cloud Functions | Appwrite Functions (Node.js 22) |
| Maps / Geocoding | Mapbox GL JS / Mapbox Directions API |
| Currency | EUR (Euro) |
| VAT Rate | 19% |

### Appwrite Project
```
Project ID: 698fcc80001f0b5149d8
Endpoint:   https://fra.cloud.appwrite.io/v1
Region:     Frankfurt (fra)
```

### Appwrite Services Required
- Authentication (email/password, Google OAuth, Phone/SMS OTP)
- Database (`picklt` database)
- Storage (buckets: `profile-photos`, `move-photos`)
- Realtime (subscriptions on moves, move_requests, mover_locations, notifications)
- Functions (10+ cloud functions)
- Messaging (for SMS via Twilio, configured in Appwrite console)

---

## 3. Authentication System

### 3.1 User Types
```typescript
type UserType = 'client' | 'mover'
```
- Client accounts and mover accounts are **separate** — a client cannot log into the mover portal. This is enforced both on the frontend and server-side.
- `userType` is stored in the `users` collection.

### 3.2 Auth Methods
1. **Google OAuth** — `account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl)`
2. **Email + Password** — `account.createEmailPasswordSession(email, password)` for login; `account.create('unique()', email, password, name)` for signup
3. **Phone OTP (mandatory)** — after any sign-in/sign-up method, the user **must** verify their phone number before accessing protected areas.

### 3.3 Phone Verification Flow (Mandatory)
This is a multi-step process that all users must complete:

**Step 1** — Set phone number on Appwrite auth account via Admin API:
```
POST /api/auth/set-phone
Body: { phone: "+491234567890" }
```

**Step 2** — Trigger SMS OTP via Appwrite's built-in phone verification:
```typescript
account.createPhoneVerification()
// This sends SMS via the configured Twilio provider in Appwrite
```

**Step 3** — Confirm OTP:
```typescript
account.updatePhoneVerification(userId, otpCode)
// Reloads session — user.phoneVerified becomes true
```

Phone number must include country code (e.g., `+4917012345678`). After OTP confirmation, the session is reloaded and `phoneVerified = true`, allowing access to protected routes.

### 3.4 Session Initialization (Important for Mobile)
After Appwrite auth (any method), the web app calls:
```
POST /api/auth/init-session
Body: { userId: string }
```
This creates a signed **HMAC-SHA256** session cookie (`picklt_session`) on the Next.js server. For the mobile app, you will use Appwrite's native session (JWT or cookie) instead of this Next.js middleware cookie — but you still need to call `/api/auth/sync-user` to sync the user profile into the `users` collection.

### 3.5 Sync User Profile
After any auth event (login / signup / OAuth callback):
```
POST /api/auth/sync-user
Body: {
  authId: string,        // Appwrite auth user ID ($id)
  email: string,
  fullName: string,
  phone: string,
  emailVerified: boolean,
  phoneVerified: boolean,
  userType?: 'client' | 'mover'  // send if known (e.g., from localStorage pending type)
}
Response: {
  user: UserDoc,
  moverProfile: MoverProfileDoc | null,
  crewMembers: CrewMemberDoc[]
}
```
This idempotently creates or updates the user document in the `users` collection.

### 3.6 User Object Shape (in-app)
```typescript
type User = {
  authId: string           // Appwrite Auth $id
  appwriteId: string | null // users collection doc $id
  fullName: string
  email: string
  phone: string
  profilePhoto?: string    // URL string (Appwrite storage URL or external)
  userType: 'client' | 'mover'
  emailVerified: boolean
  phoneVerified: boolean   // MUST be true to access protected routes
}
```

### 3.7 Logout
```typescript
await account.deleteSession('current')
// Then call:
DELETE /api/auth/clear-session  // clears server-side cookie (web only)
```
For mobile: just delete the Appwrite session.

### 3.8 Google OAuth Specifics
1. Store the intended `userType` in local storage as `picklt_pending_user_type` before initiating OAuth
2. After OAuth redirect, `loadSession` picks up the stored `userType` and sends it in `sync-user`
3. After `sync-user`, remove `picklt_pending_user_type` from local storage
4. OAuth success URL must land on a page that triggers `loadSession`, then redirects to phone verification if needed

### 3.9 Access Control Rules
- `/dashboard`, `/available-moves`, `/active-move`, `/job-details`, `/earnings`, `/my-crew`, `/settings`, `/complete-profile` → **Mover routes** (client accounts blocked)
- `/account`, `/move-choice`, `/add-listing/*`, `/instant-move/*`, `/move-preview`, `/checkout`, `/pay-done` → **Client routes** (require authentication + phone verified)
- Unauthenticated users trying to access protected routes are redirected to `/login?type=client&redirect=<original-path>`

---

## 4. Global State — MoveSearch Context

The entire move-booking process is held in a single context (`useMoveSearch`) that persists across all steps. In the web app this is React Context + `localStorage` persistence. In the mobile app, use your app's state management (Zustand, Redux, or React Context) with AsyncStorage/MMKV persistence.

### 4.1 Complete State Shape
```typescript
{
  // ── Core ──────────────────────────────────────────────────
  pickupLocation: string           // Full address string from Mapbox geocode
  dropoffLocation: string          // Full address string from Mapbox geocode
  pickupCoordinates: { latitude: number; longitude: number } | null
  dropoffCoordinates: { latitude: number; longitude: number } | null
  moveDate: string | null          // ISO date 'YYYY-MM-DD'
  moveType: 'light' | 'regular' | 'premium' | null
  isInstantMove: boolean           // true = instant, false = scheduled

  // ── Step 1: Move Details ──────────────────────────────────
  homeType: 'apartment' | 'house' | 'office' | 'storage' | null
  floorLevel: 'ground' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | null
  elevatorAvailable: boolean
  parkingSituation: 'at_building' | 'nearby' | 'no_parking' | null

  // ── Step 2: Pickup Address ────────────────────────────────
  pickupStreetAddress: string
  pickupApartmentUnit: string
  pickupAccessNotes: string
  pickupLoadingZoneRequired: boolean
  pickupArrangeHaltverbot: boolean  // German no-parking zone arrangement

  // ── Step 3: Dropoff Address ───────────────────────────────
  dropoffStreetAddress: string
  dropoffApartmentUnit: string
  dropoffFloorLevel: 'ground' | '1' ... '12' | null
  dropoffElevatorAvailable: boolean
  dropoffParkingSituation: 'directly_in_front' | 'limited' | 'street_only' | 'underground' | 'loading_zone' | null
  dropoffArrangeHaltverbot: boolean

  // ── Step 4: Inventory ─────────────────────────────────────
  inventory: Record<string, number>  // { itemId: quantity }
  customItems: CustomItem[]           // user-defined items

  // ── Step 5: Packing Services ──────────────────────────────
  packingServiceLevel: 'none' | 'partial' | 'full' | 'unpacking' | null
  packingMaterials: PackingMaterial[]
  customMaterials: CustomMaterial[]
  packingBoxQuantities: Record<string, number>
  packingNotes: string

  // ── Step 6: Move Timing ───────────────────────────────────
  arrivalWindow: string | null         // '08:00', '09:00', etc.
  flexibility: 'flexible_1hr' | 'not_flexible' | null
  preferEarliestArrival: boolean
  avoidLunchBreak: boolean
  avoidEveningDelivery: boolean

  // ── Step 7: Crew & Vehicle + Services + Photos + Contact ──
  crewSize: '1' | '2' | '3' | '4plus' | null
  vehicleType: 'small_van' | 'medium_truck' | 'large_truck' | 'multiple' | null
  truckAccess: 'easy' | 'moderate' | 'difficult' | null
  heavyItems: HeavyItem[]
  customHeavyItems: HeavyItem[]
  additionalServices: AdditionalService[]
  storageWeeks: number               // 0 means no storage
  disposalItems: string
  coverPhotoId: string | null        // base64 or Appwrite URL
  galleryPhotoIds: string[]
  contactInfo: ContactInfo
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | null
  legalConsent: { termsAccepted: boolean; privacyAccepted: boolean }

  // ── Route (calculated by Mapbox) ─────────────────────────
  routeDistanceMeters: number | null
  routeDurationSeconds: number | null

  // ── Stored Moves (client-side cache of confirmed moves) ───
  storedMoves: StoredMove[]
}
```

### 4.2 Custom Item Type
```typescript
type CustomItem = {
  id: string
  name: string
  quantity: number
  approxSize: string    // user-written estimate like "medium box"
  approxWeight: string  // user-written estimate like "~10kg"
}
```

### 4.3 State Persistence
- Persist to `AsyncStorage` with key `picklt_move_draft` (all fields except `storedMoves`)
- Persist `storedMoves` separately with key `picklt_stored_moves`
- Auto-save on any state change (debounce 300ms)
- Hydrate on app launch from AsyncStorage
- `reset()` function clears draft (but not storedMoves) and resets to defaults

---

## 5. Complete Move Type System

### 5.1 Move Categories
| Category | Description |
|---|---|
| `instant` | Client picks nearby mover now, move happens immediately |
| `scheduled` | Client books in advance with a specific date and time |

### 5.2 Move Types
| Type | Classification Points | Max Weight | Max Items | Use Case |
|---|---|---|---|---|
| `light` | 0–25 pts | ≤200 kg | ≤15 items | Studio / single room |
| `regular` | 26–80 pts | ≤800 kg | ≤40 items | 2–3 bedroom apartment |
| `premium` | 81+ pts | >800 kg | >40 items | Large home, special items |

### 5.3 How Move Type Affects Price (see Section 25)
- Light: base multiplier 1.0
- Regular: base multiplier 1.3
- Premium: base multiplier 1.8

### 5.4 Move Type Selection
- **Instant Move**: Move type is determined by the classification algorithm based on inventory items selected (not user-chosen).
- **Scheduled Move**: User selects move type manually on the home search form, but it can be auto-upgraded by the classification algorithm.

---

## 6. Instant Move Flow (Step-by-Step)

The instant move is a 4-step process after the initial home search.

### 6.1 Home Search
On the home screen, the client fills a search form with:
- **Pickup location** — Mapbox geocode autocomplete, stores full address + coordinates
- **Dropoff location** — Mapbox geocode autocomplete, stores full address + coordinates
- **Move type** — dropdown: Light / Regular / Premium

On submit → navigate to Move Choice screen.

### 6.2 Move Choice Screen (`/move-choice`)
Displays a summary of:
- Pickup address (truncated)
- Dropoff address (truncated)
- Move type (if selected)

Two action buttons:
1. **"Instant Move"** — sets `isInstantMove = true`, navigates to `/instant-move/inventory`
2. **"Book for Later"** — sets `isInstantMove = false`, navigates to `/add-listing/1`

**Auth Gate**: Requires authentication. If not logged in, redirect to `/login?type=client&redirect=/move-choice`.

### 6.3 Step 1 — Inventory (`/instant-move/inventory`)

**Purpose**: Client selects the items they're moving.

**Features**:
- Category tabs: Living Room, Bedroom, Kitchen, Office, Boxes, Miscellaneous, Special
- Each category shows items from the inventory catalog
- Each item has a `+/-` counter (min 0)
- "Add custom item" modal with fields: name, quantity, approximate size, approximate weight
- Real-time move classification — on every change, `classifyMove()` runs and shows current move type
- **Auto-upgrade modal**: if inventory exceeds the current move type's threshold, shows a modal: *"Your selected items exceed a [type] move. We've upgraded your move to [newType]."* — user must acknowledge
- **Warning alerts**: shown when approaching 80% of the next tier's threshold
- Also shows/edits pickup and dropoff location with an interactive Mapbox map

**Navigation**: Back → Move Choice | Continue → Photos step (if at least 1 item selected)

**Validation**: At least 1 item must be selected to proceed.

**API call at load time**: 
```
GET /api/inventory  (if implemented, or fallback to hardcoded catalog)
```
The inventory catalog is fetched from `inventory_catalog` Appwrite collection. If unavailable, the app uses the hardcoded fallback (see Section 15).

### 6.4 Step 2 — Photos (`/instant-move/photos`)

**Purpose**: Client uploads photos of the items to be moved.

**Features**:
- Cover photo upload (required)
- Gallery photos upload (optional, multiple)
- Images are compressed before storage (max ~500KB each)
- Images stored as base64 in context for display; uploaded to Appwrite Storage when move is created
- Photo upload to Appwrite: `POST /api/moves/upload-photos`
- At least **1 photo is required** to proceed

**Step indicator**: Step 3 of 4

**Navigation**: Back → Inventory | Continue → Select Mover (if at least 1 photo)

### 6.5 Step 3 — Select Mover (`/instant-move/select-mover`)

**Purpose**: Client selects a mover from a list of nearby verified movers.

**Features**:
- Fetches nearby movers: `GET /api/movers/nearby?lat=<lat>&lng=<lng>&radiusKm=25`
- Shows loading state for ~1 second (UX delay for better perceived loading)
- Each mover card shows:
  - Profile photo + name
  - Star rating (e.g., ★ 4.8)
  - Total moves completed
  - Vehicle type + capacity description
  - Distance from pickup (e.g., "2.3 km away")
  - Crew size (e.g., "2 people")
  - Years of experience
  - Languages spoken
  - Verified badge
  - **Estimated price** (calculated client-side from route distance + mover's base rate + crew surcharge + item fee)
- Route distance is calculated via Mapbox Directions API directly from the client
- Movers sorted by distance (nearest first)
- User taps to select mover (single selection)
- If no movers found: show "No movers available" state with option to try again

**Price calculation per mover** (client-side):
```
distanceKm = routeDistanceMeters / 1000
baseRate = mover.baseRatePerKm || 2.0        // EUR per km
baseFee = 25                                  // EUR flat fee
crewSurcharge = (crewSize - 1) * 10          // EUR per extra crew member
itemFeePerItem = {
  truck:      2.0,
  large_van:  2.5,
  medium_van: 3.0,
  small_van:  3.5,  // default
}
itemsFee = inventoryCount * itemFeePerItem
totalPrice = Math.round(baseFee + (distanceKm * baseRate) + crewSurcharge + itemsFee)
```

**Step indicator**: Step 4 of 4

**On "Confirm Mover"**:
1. Upload all photos to Appwrite Storage: `POST /api/moves/upload-photos`
2. Create the instant move: `POST /api/moves/create-instant` (see Section 18)
3. Navigate to `/checkout?source=instant` (or directly to confirmation)

### 6.6 Instant Move Checkout

After mover selected and move created, navigate to checkout with URL params:
- `?distance=<meters>&duration=<seconds>&price=<moverPrice>`

Checkout shows:
- Move summary (pickup, dropoff, item count)
- Selected mover info
- Price breakdown
- Payment method selection (Cash / Card / PayPal)
- Terms & Privacy checkboxes
- Confirm button → navigates to pay-done

---

## 7. Scheduled Move Flow (Step-by-Step)

The scheduled move is a 7-step wizard. All steps are guarded by `AuthGate` (requires auth + phone verified).

### Step 1 — Move Details (`/add-listing/1`)

**Fields**:
- Pickup location (Mapbox autocomplete, editable from this step too)
- Dropoff location (Mapbox autocomplete)
- Move date — `DatePicker`, stores as ISO string `YYYY-MM-DD`
- Home type — Select: Apartment / House / Office / Storage
- Floor level — Select: Ground / 1 / 2 / ... / 12  
- Elevator available — Toggle/Checkbox
- Parking situation — Select: At building / Nearby / No parking

**Map**: Shows route on Mapbox map if both coordinates are set. Clicking pickup/dropoff markers opens a MapLocationPicker to change locations.

**Validation**: move date, homeType, floorLevel, parkingSituation are required.

**Context actions**: `setHomeType`, `setFloorLevel`, `setElevatorAvailable`, `setParkingSituation`, `setMoveDate`, `setPickupLocation`, `setDropoffLocation`, `setPickupCoordinates`, `setDropoffCoordinates`

**Navigation**: Back → Home | Next → Step 2

---

### Step 2 — Pickup Address (`/add-listing/2`)

**Fields**:
- Street address (pre-filled from first part of `pickupLocation`)
- Apartment / Unit (optional)
- Access notes (optional, e.g., "code 1234 on intercom")
- Loading zone required? (boolean - yes/no radio)
- Arrange Haltverbot (no-parking zone)? (boolean - yes/no radio) — Germany-specific

**Validation**: Street address required.

**Context actions**: `setPickupStreetAddress`, `setPickupApartmentUnit`, `setPickupAccessNotes`, `setPickupLoadingZoneRequired`, `setPickupArrangeHaltverbot`

---

### Step 3 — Dropoff Address (`/add-listing/3`)

**Fields**:
- Street address (pre-filled from first part of `dropoffLocation`)
- Apartment / Unit (optional)
- Floor level — Select: Ground / 1 / 2 / ... / 12
- Elevator available — Toggle
- Parking situation — Select: Directly in front / Limited / Street only / Underground / Loading zone
- Arrange Haltverbot? — yes/no

**Validation**: Street address, floor level, parking situation required.

**Context actions**: `setDropoffStreetAddress`, `setDropoffApartmentUnit`, `setDropoffFloorLevel`, `setDropoffElevatorAvailable`, `setDropoffParkingSituation`, `setDropoffArrangeHaltverbot`

---

### Step 4 — Inventory (`/add-listing/4`)

**Same as Instant Move inventory** (Section 6.3) but within the scheduled flow. Same category tabs, same classification algorithm, same auto-upgrade modal.

**Context actions**: `setInventoryItem`, `addCustomItem`, `removeCustomItem`, `updateCustomItem`

---

### Step 5 — Packing Services (`/add-listing/5`)

**Fields**:

**Packing service level** — radio group:
- `none` — No packing help needed
- `partial` — Pack some items (fragile/valuables)
- `full` — Pack everything
- `unpacking` — Pack AND unpack at destination

**Packing materials** (multi-select checkboxes):
- `moving_boxes` — Moving boxes
- `wardrobe_boxes` — Wardrobe boxes
- `bubble_wrap` — Bubble wrap
- `packing_paper` — Packing paper
- `packing_tape` — Packing tape
- `mattress_covers` — Mattress covers
- `tv_protection` — TV protection
- `dish_inserts` — Dish/cup inserts
- `furniture_blankets` — Furniture blankets

**Custom materials**: Add additional packing materials by name.

**Box quantities**: For materials that have quantities (e.g., number of moving boxes).

**Packing notes**: Free text for special instructions.

**Context actions**: `setPackingServiceLevel`, `togglePackingMaterial`, `addCustomMaterial`, `removeCustomMaterial`, `setPackingBoxQuantity`, `setPackingNotes`

---

### Step 6 — Move Timing (`/add-listing/6` — mapped as step 5 in nav counter)

**Fields**:
- **Move date display** — shows date from Step 1 (read-only here)
- **Arrival time** — TimePicker (24h format stored, displayed as 12h)
- **Flexibility** — radio group (shown only if time is set):
  - `flexible_1hr` — I'm flexible within 1 hour
  - `not_flexible` — I need the exact time

**Preference checkboxes**:
- Prefer earliest arrival (ignores preferred window)
- Avoid lunch break (12:00–13:00)
- Avoid evening delivery (after 17:00)

**Context actions**: `setArrivalWindow`, `setFlexibility`, `setPreferEarliestArrival`, `setAvoidLunchBreak`, `setAvoidEveningDelivery`

---

### Step 7 — Additional Services, Photos & Contact (`/add-listing/7` — mapped as steps 6+7+review)

This is actually 3 combined sub-sections:

#### Sub-section A: Additional Services
**Multi-select checkboxes**:
- `furniture_disassembly` — Disassemble beds, wardrobes, tables before loading
- `furniture_assembly` — Reassemble at new location
- `tv_mount_remove` — Mount or remove wall-mounted TVs
- `appliance_disconnect` — Disconnect washing machine, dishwasher, dryer
- `appliance_connect` — Reconnect appliances at new address
- `disposal_entsorgung` — Dispose of unwanted furniture (German: Entsorgung)
- `moveout_cleaning` — Professional cleaning of old apartment
- `temporary_storage` — Store items securely between moves

**If `temporary_storage` selected**: Show number input for storage weeks  
**If `disposal_entsorgung` selected**: Show text area for disposal item list

#### Sub-section B: Photos
Same as instant move photos (cover photo + gallery). Photos compressed before upload.

#### Sub-section C: Contact Information
Auto-populated from the authenticated user's profile. Editable:
- Full name (required)
- Phone number (required)
- Email address (required, validated)
- Notes for movers (optional, e.g., "buzzer code is 1234")
- **Business move?** — checkbox, reveals:
  - Company name
  - VAT ID

**Payment method selection**:
- `cash` — Pay mover directly
- `card` — Card payment
- `paypal` — PayPal

**Context actions**: `toggleAdditionalService`, `setStorageWeeks`, `setDisposalItems`, `setCoverPhotoId`, `addGalleryPhotoId`, `removeGalleryPhotoId`, `updateContactInfo`, `setPaymentMethod`

**On Submit**: Navigate to `/move-preview`

---

## 8. Move Preview & Submission

### 8.1 Move Preview Screen (`/move-preview`)

Shows a complete summary of all move details before submission:
- Route map (Mapbox) with pickup/dropoff markers
- Move date & time
- Home type, floor levels, elevators, parking
- Pickup address & notes
- Dropoff address & notes
- Inventory summary (item count by category)
- Custom items list
- Packing service & materials
- Additional services
- Crew & vehicle preferences
- Contact information
- Payment method

Editable: location pickers on the map are clickable to change pickup/dropoff.

**Two action buttons**:
- "Edit" — goes back to any step
- "Proceed to payment" → triggers `POST /api/moves/create-scheduled` and redirects to `/checkout`

### 8.2 Scheduled Move Creation API
```
POST /api/moves/create-scheduled
Headers: Cookie: picklt_session=<token>  (or Authorization: Bearer <jwt> for mobile)
Body: {
  // Locations
  pickupLocation, pickupLatitude, pickupLongitude, pickupStreetAddress,
  pickupApartmentUnit, pickupAccessNotes,
  dropoffLocation, dropoffLatitude, dropoffLongitude, dropoffStreetAddress,
  dropoffApartmentUnit,
  // Move details
  moveDate, moveType, homeType, floorLevel, elevatorAvailable,
  parkingSituation, pickupHaltverbot, dropoffFloorLevel,
  dropoffElevatorAvailable, dropoffParkingSituation, dropoffHaltverbot,
  // Inventory
  inventoryItems (JSON string), customItems (string array of JSON), totalItemCount,
  // Packing
  packingServiceLevel, packingMaterials (array), packingNotes,
  // Timing
  arrivalWindow, flexibility,
  // Crew
  crewSize, vehicleType,
  // Services
  additionalServices (array), storageWeeks, disposalItems,
  // Photos (already uploaded Appwrite file IDs or base64)
  coverPhotoId, galleryPhotoIds (array),
  // Contact
  contactName, contactEmail, contactPhone, contactNotes,
  isBusinessMove, companyName, vatId,
  // Route
  routeDistanceMeters, routeDurationSeconds,
  // Pricing
  estimatedPrice, finalPrice,
  paymentMethod
}
Response: {
  success: true,
  moveId: string,
  handle: string  // e.g. "SM-LK4A2B"
}
```

The `handle` format for scheduled moves: `SM-<base36-timestamp-uppercase>` (e.g., `SM-LK4A2B`).

---

## 9. Checkout & Payment

### 9.1 Checkout Screen (`/checkout`)

**URL params** (for instant moves):
- `?distance=<meters>&duration=<seconds>&price=<moverPrice>`

**Auto-populate contact info**: If user is authenticated and `contactInfo` is empty, auto-fill from `user.fullName`, `user.email`, `user.phone`.

**Price Calculation**:

For **Instant Move**:
```
basePrice = moverPrice (from URL param, already calculated per mover)
  || fallback: Math.round(30 + (distanceKm * 2))
  || default: 49
packingPrice = 0       // not offered for instant
servicesPrice = 0      // not offered for instant
itemsPrice = inventoryCount * 5   // only if no moverPrice
subtotal = basePrice + itemsPrice
tax = Math.round(subtotal * 0.19)   // 19% VAT
total = subtotal + tax
```

For **Scheduled Move**:
```
basePrice = moveType === 'premium' ? 299 : moveType === 'regular' ? 199 : 99
packingPrice = full: 250 | unpacking: 350 | partial: 150 | none: 0
servicesPrice = additionalServices.length * 50
storagePrice = storageWeeks * 30
subtotal = basePrice + packingPrice + servicesPrice + storagePrice
tax = Math.round(subtotal * 0.19)   // 19% VAT
total = subtotal + tax
```

**Payment Method UI**:
Three tabs: Cash / Card / PayPal

- **Cash**: Info box: "Pay your mover directly. Have €X.XX ready."
- **Card**: Card number, cardholder name, expiry, CVV (for future implementation)
- **PayPal**: PayPal email field

**Legal checkboxes**:
- "I agree to the Terms of Service"
- "I agree to the Privacy Policy"
Both required to proceed.

**On submit**:
1. Validate required fields
2. Call `POST /api/moves/create-instant` (for instant) or mark payment as confirmed
3. Add to `storedMoves` in context
4. Navigate to `/pay-done?handle=<handle>&paymentMethod=<method>`

### 9.2 Pay Done Screen (`/pay-done`)

**URL params**: `?handle=<moveHandle>&paymentMethod=<cash|card|paypal>`

**Content varies by type & payment**:
- Instant move + cash → "Your move is confirmed!" + amber "Pay Later" badge + payment reminder
- Instant move + card → "Move confirmed and paid!" + lime "In Progress" badge
- Scheduled + cash → "Booking confirmed!" + amber "Confirmed - Pay Later" badge
- Scheduled + card → "Congratulations 🎉" + yellow "Pending" badge

**Always shows**:
- Move handle / booking code (e.g., `SM-LK4A2B`)
- Payment method icon
- Cash reminder if payment is cash: "Have €X.XX ready to pay your mover"
- Summary: pickup address, dropoff address, move date/type
- Link to move details page
- Link to "View all my moves"

---

## 10. Move Details & Tracking

### 10.1 Move Details Screen (`/move-details/[handle]`)

Accessed from: My Moves list, Pay Done screen, notifications.

**Data loading**:
1. First checks `storedMoves` in context (`getMoveByHandle(handle)`)
2. If not found locally → `GET /api/moves/by-handle/[handle]`
3. Also subscribes to Appwrite Realtime for live status updates

**Displays**:
- Status badge (Pending / In Progress / Completed / Cancelled)
- Move handle / booking code
- Move category (Instant / Scheduled)
- Move date and time
- Route map with pickup → dropoff markers
- Pickup & dropoff addresses (full details)
- Home type, floor levels, elevator, parking
- Inventory count
- Packing service requested
- Additional services
- Crew size & vehicle type
- Estimated price
- Payment method

**Mover Info Card** (if mover is assigned):
Fetched from the enriched moves API which includes mover data:
- Profile photo
- Full name
- Phone (tappable — opens phone dialer)
- Star rating
- Total moves completed
- Vehicle brand/model/plate
- Crew size
- Years of experience
- Languages spoken
- Verified badge

**Status-specific Actions**:
- `pending` / `booked` → "Cancel Move" button, "Reschedule" button (if status is `draft` or `booked`)
- `in_progress` → "Track Mover" button (opens real-time map)
- `awaiting_payment` → "Confirm Payment" button (cash flow)
- `completed` → "Leave a Review" button (if no review yet)
- `cancelled` → No actions

**Move Status Labels** (for display):
```
draft → Pending
booked → Pending
pending_payment → Pending
paid → Pending
mover_assigned → Pending
mover_accepted → In Progress
mover_en_route → In Progress (shows tracking)
mover_arrived → In Progress
loading → In Progress
in_transit → In Progress (shows tracking)
arrived_destination → In Progress
unloading → In Progress
awaiting_payment → In Progress
completed → Completed
cancelled_by_client → Cancelled
cancelled_by_mover → Cancelled
disputed → Cancelled
```

**Display Status Groups** (for filtering):
```typescript
function mapDbStatus(dbStatus: string): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
  if (['draft','booked','pending_payment','paid','mover_assigned'].includes(dbStatus))
    return 'pending'
  if (['mover_accepted','mover_en_route','mover_arrived','loading','in_transit',
       'arrived_destination','unloading','awaiting_payment'].includes(dbStatus))
    return 'in_progress'
  if (dbStatus === 'completed') return 'completed'
  return 'cancelled'
}
```

### 10.2 Cancel Move
```
POST /api/moves/cancel
Body: { moveId: string }
```
Only allowed for statuses: `draft`, `booked`, `pending_payment`, `paid`, `mover_assigned`, `mover_accepted`.

Side effects: Automatically expires/declines any pending `move_requests` for this move.

### 10.3 Reschedule Move
```
POST /api/moves/reschedule
Body: { moveId: string, moveDate: string, arrivalWindow?: string }
```
Only allowed for statuses: `draft`, `booked`. Move date must be in the future.

### 10.4 Confirm Payment (Cash Flow)
```
POST /api/moves/confirm-payment
Body: { moveId: string }
```
Only allowed when `move.status === 'awaiting_payment'`. When both client and mover confirm, status transitions to `completed` and mover stats are updated.

### 10.5 Real-Time Map Tracking

When status is `mover_en_route` or `in_transit`, show a full map with:
- Pickup marker (green)
- Dropoff marker (red)
- Mover marker (animated, blue vehicle icon)
- Route line between markers

**Appwrite Realtime subscription**:
```typescript
const channel = `databases.${DATABASE_ID}.collections.${MOVER_LOCATIONS_COLLECTION}.documents`
client.subscribe(channel, (event) => {
  if (event.payload.moveId === currentMoveId) {
    updateMoverPosition({
      latitude: event.payload.latitude,
      longitude: event.payload.longitude
    })
  }
})
```

---

## 11. My Moves — Move Management

### 11.1 My Scheduled Moves Screen (`/my-scheduled-moves`)

**Data loading**: `GET /api/moves?limit=100`

Response: `{ documents: MoveDoc[], total: number }`

**Filtering**:
- Only shows `moveCategory === 'scheduled'` moves (instant moves shown separately or on same screen)
- Status tabs: All / Pending / In Progress / Completed / Cancelled

**Realtime subscription** — subscribes to moves collection for live updates:
```typescript
const channel = `databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents`
client.subscribe(channel, () => fetchMoves())
```

**Each move card (MoveCard component) shows**:
- Cover photo or gallery photo (slider if multiple)
- Status badge
- Move handle
- Move date
- Pickup street address
- Item count
- Crew size
- Vehicle type
- Total price (EUR)
- Tapping card → `/move-details/[handle]`

### 11.2 Moves List API
```
GET /api/moves?status=<status>&limit=25&offset=0
Response: {
  documents: MoveDoc[],
  total: number
}
```
Filters by `clientId === currentUserId`. Ordered by `$createdAt` descending.

---

## 12. Account Management

### 12.1 Account Screen (`/account`)

Requires authentication. If not logged in → redirect to login.

**Sections**:
1. **Profile header** — Avatar/photo, full name, email
2. **Edit profile** — Edit name modal, change email, change phone
3. **Navigation links**:
   - My Scheduled Moves
   - Billing / Payment methods (planned)
   - Change password
   - Help & Support
   - Sign out

### 12.2 Profile Photo Upload
```
POST /api/user/upload-photo
Content-Type: multipart/form-data
Body: FormData { file: File }
Response: { photoUrl: string }  // Appwrite storage URL
```
Validation: must be image, max 5MB. Image is compressed before upload.
Avatar initials generated from `fullName` (e.g., "Max Muster" → "MM").

### 12.3 Edit Full Name
```
PATCH /api/user/profile
Body: { fullName: string }
Response: { success: true }
```

### 12.4 Change Email
```
POST /api/user/change-email
Body: { email: string }
Response: { success: true }
```
After success, triggers `account.createVerification(verifyUrl)` to send verification email.

### 12.5 Change Phone
Two-step:
1. `POST /api/auth/set-phone` — `{ phone: "+49..." }` — updates Appwrite auth account
2. `account.createPhoneVerification()` — sends SMS OTP
3. `account.updatePhoneVerification(userId, otp)` — confirms OTP

### 12.6 Change Password (for email/password accounts)
```
POST /api/user/change-password (not yet implemented, planned)
Uses: account.updatePassword(newPassword, oldPassword)
```

---

## 13. Notifications System

### 13.1 Notification Center

**Fetch notifications**:
```
GET /api/notifications?unreadOnly=false&limit=50
Response: { documents: NotificationDoc[], total: number }
```
Only returns notifications for the current authenticated user.

### 13.2 Notification Types
```typescript
type NotificationType =
  | 'move_request'     // For movers: new move request received
  | 'move_accepted'    // For clients: mover accepted their move
  | 'mover_arrived'    // For clients: mover has arrived at pickup
  | 'move_completed'   // For clients & movers: move completed
  | 'payment'          // Payment status update
  | 'review'           // New review received (movers)
  | 'system'           // General announcements
```

### 13.3 Realtime Notification Updates
The `NotificationWrapper` component subscribes to:
```typescript
// Moves collection — status changes trigger notification sounds
`databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents`

// Move requests collection — for mover side (not needed in client app)
`databases.${DATABASE_ID}.collections.${MOVE_REQUESTS_COLLECTION}.documents`
```

When a move status change is detected:
- Play a 3-note ascending chime (C5→E5→G5) as notification sound
- The chime is pre-warmed on first user interaction to comply with autoplay policies

### 13.4 Notification Badge
Show unread count on notification bell icon. Fetch `GET /api/notifications?unreadOnly=true`.

### 13.5 Mark Notification as Read (not yet implemented as API)
Update `notifications` document: `{ isRead: true }` via Appwrite client SDK or dedicated API.

---

## 14. Review & Rating System

### 14.1 Leave a Review

Available when `move.status === 'completed'` and no existing review for the move.

**UI**:
- 1–5 star rating (tappable stars)
- Optional text comment
- Submit button

**API**:
```
POST /api/reviews
Body: { moveId: string, rating: number (1-5), comment?: string }
Response: { success: true, review: { id, rating, comment } }
```

**Validation**:
- Move must be `completed`
- Current user must be the client of the move
- Only one review per move per user (returns 409 if duplicate)
- Rating must be 1–5

**Side effects**:
- Recalculates mover's average rating across all their reviews (updated in `mover_profiles.rating`)

---

## 15. Inventory Catalog & Classification Algorithm

### 15.1 Catalog Categories
| Slug | Display Name |
|---|---|
| `living_room` | Living Room |
| `bedroom` | Bedroom |
| `kitchen` | Kitchen |
| `office` | Office |
| `boxes` | Boxes |
| `miscellaneous` | Miscellaneous |
| `special` | Special Items |

New categories are added dynamically when admin adds items with new `category` slugs.

### 15.2 Full Inventory Catalog (Hardcoded Fallback)

#### Living Room
| ID | Name | Classification Pts | Min Move Type |
|---|---|---|---|
| `sofa_2seater` | Sofa (2-seater) | 8 | regular |
| `sofa_3seater` | Sofa (3-seater) | 12 | regular |
| `coffee_table` | Coffee table | 3 | light |
| `tv` | TV | 2 | light |
| `tv_stand` | TV stand | 4 | regular |
| `bookshelf_living` | Bookshelf | 5 | regular |
| `armchair` | Armchair | 4 | regular |

#### Bedroom
| ID | Name | Classification Pts | Min Move Type |
|---|---|---|---|
| `bed_90` | Bed (90 cm) | 6 | regular |
| `bed_140` | Bed (140 cm) | 8 | regular |
| `bed_160` | Bed (160 cm) | 10 | regular |
| `mattress` | Mattress | 5 | regular |
| `wardrobe_small` | Wardrobe (small) | 8 | regular |
| `wardrobe_medium` | Wardrobe (medium) | 12 | premium |
| `wardrobe_large` | Wardrobe (large) | 18 | premium |
| `nightstand` | Nightstand | 2 | light |

#### Kitchen
| ID | Name | Classification Pts | Min Move Type |
|---|---|---|---|
| `dining_table_small` | Dining table (small) | 5 | regular |
| `dining_table_large` | Dining table (large) | 8 | regular |
| `chairs` | Chairs | 1 | light |
| `fridge_small` | Fridge (small) | 4 | regular |
| `fridge_medium` | Fridge (medium) | 6 | regular |
| `fridge_large` | Fridge (large) | 10 | premium |
| `dishwasher` | Dishwasher | 5 | regular |
| `microwave` | Microwave | 2 | light |

#### Office
| ID | Name | Classification Pts | Min Move Type |
|---|---|---|---|
| `office_desk` | Office desk | 5 | regular |
| `office_chair` | Office chair | 2 | light |
| `bookshelf_office` | Bookshelf | 5 | regular |
| `filing_cabinet` | Filing cabinet | 4 | regular |

#### Boxes
| ID | Name | Classification Pts | Min Move Type |
|---|---|---|---|
| `cardboard_boxes` | Cardboard boxes | 2 | light |
| `suitcases` | Suitcases | 2 | light |

#### Miscellaneous
| ID | Name | Classification Pts | Min Move Type |
|---|---|---|---|
| `bicycle` | Bicycle | 3 | light |
| `lamp` | Lamp | 1 | light |
| `mirror` | Mirror | 2 | light |
| `rug` | Rug | 2 | light |
| `plants` | Plants | 1 | light |

#### Special Items
| ID | Name | Classification Pts | Min Move Type |
|---|---|---|---|
| `piano` | Piano | 25 | premium |
| `safe` | Safe | 20 | premium |
| `treadmill` | Treadmill | 15 | premium |
| `aquarium` | Aquarium | 12 | premium |
| `glass_cabinet` | Glass cabinet | 10 | premium |
| `artwork_fragile` | Artwork / Fragile items | 5 | regular |

### 15.3 Classification Algorithm (`classifyMove`)

```typescript
function classifyMove(
  inventory: Record<string, number>,      // { itemId: quantity }
  customItems: CustomItemInput[],
  currentMoveType: 'light' | 'regular' | 'premium',
  itemCatalog: InventoryItemDef[]
): MoveClassification

type MoveClassification = {
  recommendedType: 'light' | 'regular' | 'premium'
  totalPoints: number
  totalWeightKg: number
  totalVolumeCm3: number
  totalItems: number
  warnings: string[]
  requiresUpgrade: boolean
  upgradeFrom?: 'light' | 'regular' | 'premium'
  upgradeTo?: 'light' | 'regular' | 'premium'
}
```

**Algorithm**:
1. For each item in inventory: `totalPoints += item.classificationPoints * quantity`
2. For each custom item: add 3 pts, estimate 20kg, estimate 125,000 cm³
3. Determine type:
   - `premium` if `totalPoints > 80 || totalWeightKg > 800 || totalItems > 40`
   - `regular` if `totalPoints > 25 || totalWeightKg > 200 || totalItems > 15`
   - else `light`
4. Check each item's `moveTypeMinimum`:
   - If item requires `premium` and current is not `premium` → add warning
   - If item requires `regular` and current is `light` → add warning
5. Approach warnings (80% threshold):
   - In `light` move: warn if `totalPoints > 20`
   - In `regular` move: warn if `totalPoints > 64`
6. `requiresUpgrade = typeOrder[recommendedType] > typeOrder[currentMoveType]`

**UI behavior**:
- Run on every inventory change
- Show warning banner if `warnings.length > 0`
- Show upgrade modal if `requiresUpgrade === true`
- Auto-update `moveType` in context when user acknowledges upgrade

---

## 16. Mover Discovery & Pricing

### 16.1 Nearby Movers API
```
GET /api/movers/nearby?lat=<lat>&lng=<lng>&radiusKm=25
Headers: Authorization (session)
Response: {
  movers: MoverWithDistance[],
  total: number
}
```

**Query logic**:
1. Fetch all `mover_profiles` where `verificationStatus = 'verified'` AND `isOnline = true` (limit 50)
2. Filter by Haversine distance ≤ `radiusKm` km
3. Sort by distance ascending
4. Enrich each mover with user data (fullName, profilePhotoUrl) from `users` collection

**Each mover in response**:
```typescript
{
  $id: string
  userId: string
  fullName?: string
  profilePhotoUrl?: string
  rating?: number             // 1–5
  totalMoves?: number
  vehicleType?: string        // 'small_van' | 'medium_van' | 'large_van' | 'truck' | 'car'
  vehicleBrand?: string
  vehicleModel?: string
  vehiclePlateNumber?: string
  crewSize?: number           // total crew including driver
  maxCarryWeight?: number
  yearsExperience?: number
  languages?: string[]
  isVerified?: boolean
  verificationStatus?: string
  currentLatitude?: number
  currentLongitude?: number
  distanceKm?: number         // calculated server-side
  baseRatePerKm?: number      // EUR per km
}
```

### 16.2 Vehicle Type Labels & Capacity
```typescript
const VEHICLE_LABELS = {
  small_van:  'Small Van',
  medium_van: 'Medium Van',
  large_van:  'Large Van',
  truck:      'Truck',
  car:        'Car',
}

const VEHICLE_CAPACITY = {
  small_van:  'Studio / 1 room',
  medium_van: '1-2 bedrooms',
  large_van:  '2-3 bedrooms',
  truck:      '3+ bedrooms',
  car:        'Few small items',
}
```

### 16.3 Haversine Distance Formula
```typescript
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
```

---

## 17. Maps Integration

### 17.1 Mapbox Configuration
```
Access Token: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
Style (light): mapbox://styles/mapbox/light-v11
Style (dark): mapbox://styles/mapbox/dark-v11
Default center: [13.405, 52.52] (Berlin)
```

### 17.2 Geocoding (Location Search)
Uses Mapbox Geocoding API for address autocomplete:
```
GET https://api.mapbox.com/geocoding/v5/mapbox.places/<query>.json
  ?access_token=<token>
  &country=de,at,ch   (or wider for other regions)
  &types=address,place
  &limit=5
```

Response provides `center: [longitude, latitude]` and `place_name: string`.

### 17.3 Route Calculation
Mapbox Directions API:
```
GET https://api.mapbox.com/directions/v5/mapbox/driving/<lng1>,<lat1>;<lng2>,<lat2>
  ?overview=full&geometries=geojson&access_token=<token>

Response routes[0]:
  distance: number  // meters
  duration: number  // seconds
  geometry: GeoJSON LineString  // for route line on map
```

### 17.4 MapboxMap Component Props
```typescript
interface MapboxMapProps {
  className?: string
  pickupCoordinates?: { latitude: number; longitude: number }
  dropoffCoordinates?: { latitude: number; longitude: number }
  moverCoordinates?: { latitude: number; longitude: number }  // for live tracking
  showRoute?: boolean          // draw route line between markers
  showUserLocation?: boolean   // show blue dot for device GPS
  onMapLoad?: (map: Map) => void
  onRouteCalculated?: (info: { distance: number; duration: number }) => void
  onPickupMarkerClick?: () => void   // opens location picker
  onDropoffMarkerClick?: () => void  // opens location picker
}
```

### 17.5 Map Markers
- **Green marker**: Pickup location
- **Red/blue marker**: Dropoff location
- **Animated vehicle marker**: Mover live position (during `mover_en_route` / `in_transit`)
- **Blue dot**: User's device GPS location

### 17.6 Live Tracking Subscription
```typescript
// Subscribe to mover location updates
const unsubscribe = client.subscribe(
  `databases.${DATABASE_ID}.collections.${MOVER_LOCATIONS_COLLECTION}.documents`,
  (response) => {
    if (response.payload.moveId === currentMoveId) {
      updateMoverMarker({
        latitude: response.payload.latitude,
        longitude: response.payload.longitude,
      })
    }
  }
)
```

---

## 18. API Endpoints Reference

All API endpoints require authentication. For mobile, pass the Appwrite JWT token or use the Appwrite mobile SDK sessions.

### Auth APIs

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/sync-user` | Sync Appwrite auth user → users collection |
| POST | `/api/auth/set-phone` | Set phone on Appwrite auth account (admin API) |
| POST | `/api/auth/init-session` | Create server-side session cookie (web only) |
| POST | `/api/auth/clear-session` | Delete server-side session cookie (web only) |

### Move APIs

| Method | Path | Description |
|---|---|---|
| GET | `/api/moves` | List user's moves. Params: `?status&limit&offset` |
| GET | `/api/moves/[id]` | Get single move by Appwrite doc ID |
| GET | `/api/moves/by-handle/[handle]` | Get move by handle (e.g., `SM-LK4A2B`) |
| POST | `/api/moves/create-instant` | Create instant move + move_request |
| POST | `/api/moves/create-scheduled` | Create scheduled move |
| POST | `/api/moves/cancel` | Cancel a move (`{ moveId }`) |
| POST | `/api/moves/reschedule` | Reschedule a move (`{ moveId, moveDate, arrivalWindow? }`) |
| POST | `/api/moves/confirm-payment` | Client confirms cash payment (`{ moveId }`) |
| POST | `/api/moves/payment-status` | Check payment status |
| POST | `/api/moves/upload-photos` | Upload move photos to Appwrite Storage |

### User APIs

| Method | Path | Description |
|---|---|---|
| PATCH | `/api/user/profile` | Update user profile (`{ fullName? }`) |
| POST | `/api/user/upload-photo` | Upload profile photo (multipart) |
| POST | `/api/user/change-email` | Request email change |
| POST | `/api/user/change-phone` | Request phone change |

### Mover APIs

| Method | Path | Description |
|---|---|---|
| GET | `/api/movers/nearby` | Find nearby movers. Params: `?lat&lng&radiusKm` |

### Notification APIs

| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications` | Get user notifications. Params: `?unreadOnly&limit` |

### Review APIs

| Method | Path | Description |
|---|---|---|
| POST | `/api/reviews` | Submit review `{ moveId, rating, comment? }` |

### Inventory APIs

| Method | Path | Description |
|---|---|---|
| GET | `/api/inventory` | Get inventory catalog (if implemented) |

---

## 19. Database Collections & Schemas

### `users` collection
```typescript
{
  $id: string               // Appwrite doc ID
  $createdAt: string
  email: string             // unique
  fullName: string
  phone: string | null
  profilePhoto: string | null  // Appwrite storage URL
  userType: 'client' | 'mover'
  emailVerified: boolean
  phoneVerified: boolean
}
```

### `mover_profiles` collection
```typescript
{
  $id: string
  userId: string            // ref to users.$id
  driversLicense: string | null
  driversLicensePhoto: string | null
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: string | null
  vehicleCapacity: string | null      // kg
  vehicleRegistration: string | null  // plate number
  vehicleType: 'small_van' | 'medium_truck' | 'large_truck' | null
  rating: number | null               // average 1–5
  totalMoves: number | null
  yearsExperience: number | null
  verificationStatus: 'pending_verification' | 'verified' | 'suspended' | 'rejected'
  isOnline: boolean                   // accepting move requests
  currentLatitude: number | null
  currentLongitude: number | null
  languages: string[]
  baseRate: number | null             // EUR per km
}
```

### `moves` collection (central document)
```typescript
{
  $id: string
  handle: string                     // e.g. "IM-LK4A2B" or "SM-LK4A2B"
  clientId: string                   // ref to users.$id
  moverProfileId: string | null      // ref to mover_profiles.$id
  status: MoveStatusEnum             // see Section 10.1
  moveCategory: 'instant' | 'scheduled'
  moveType: 'light' | 'regular' | 'premium'
  systemMoveType: 'light' | 'regular' | 'premium'  // server-classified
  moveDate: string | null            // ISO datetime
  // Pickup
  pickupLocation: string | null      // full address
  pickupLatitude: number | null
  pickupLongitude: number | null
  pickupStreetAddress: string | null
  pickupApartmentUnit: string | null
  pickupFloorLevel: string | null
  pickupElevator: boolean | null
  pickupParking: string | null
  pickupHaltverbot: boolean | null
  // Dropoff
  dropoffLocation: string | null
  dropoffLatitude: number | null
  dropoffLongitude: number | null
  dropoffStreetAddress: string | null
  dropoffApartmentUnit: string | null
  dropoffFloorLevel: string | null
  dropoffElevator: boolean | null
  dropoffParking: string | null
  dropoffHaltverbot: boolean | null
  // Property
  homeType: 'apartment' | 'house' | 'office' | 'storage' | null
  // Inventory
  inventoryItems: string | null      // JSON: Record<string, number>
  customItems: string[]              // array of JSON CustomItem strings
  totalItemCount: number | null
  totalWeightKg: number | null
  totalVolumeCm3: number | null
  // Packing
  packingServiceLevel: 'none' | 'partial' | 'full' | 'unpacking' | null
  packingMaterials: string[]
  packingNotes: string | null
  // Timing
  arrivalWindow: string | null       // "09:00"
  flexibility: 'flexible_1hr' | 'not_flexible' | null
  // Crew
  crewSize: string | null
  vehicleType: string | null
  // Services
  additionalServices: string[]
  storageWeeks: number
  // Photos
  coverPhotoId: string | null        // Appwrite file ID
  galleryPhotoIds: string[]
  // Contact
  contactFullName: string | null
  contactPhone: string | null
  contactEmail: string | null
  contactNotes: string | null
  isBusinessMove: boolean | null
  companyName: string | null
  vatId: string | null
  // Pricing
  estimatedPrice: number | null      // EUR
  finalPrice: number | null
  routeDistanceMeters: number | null
  routeDurationSeconds: number | null
  // Legal
  termsAccepted: boolean | null
  privacyAccepted: boolean | null
  // Timestamps
  paidAt: string | null
  completedAt: string | null
}
```

### `move_requests` collection
```typescript
{
  $id: string
  moveId: string                     // ref to moves.$id
  moverProfileId: string             // ref to mover_profiles.$id
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  sentAt: string                     // ISO datetime
  respondedAt: string | null
  expiresAt: string                  // ISO datetime (3 minutes for instant, 60s per backend)
}
```

### `mover_locations` collection
```typescript
{
  $id: string
  moverProfileId: string
  moveId: string
  latitude: number
  longitude: number
  heading: number | null             // compass degrees
  speed: number | null               // km/h
  timestamp: string
}
```

### `notifications` collection
```typescript
{
  $id: string
  userId: string
  type: 'move_request' | 'move_accepted' | 'mover_arrived' | 'move_completed' | 'payment' | 'review' | 'system'
  title: string
  body: string
  data: string | null                // JSON extra payload (e.g., { moveId })
  isRead: boolean
  $createdAt: string
}
```

### `reviews` collection
```typescript
{
  $id: string
  moveId: string
  reviewerId: string                 // client's user ID
  moverProfileId: string
  rating: number                     // 1–5
  comment: string | null
  $createdAt: string
}
```

### `payments` collection
```typescript
{
  $id: string
  moveId: string
  clientId?: string                  // ref to users.$id (field name: "users" in some versions)
  amount: number                     // EUR
  currency: string                   // 'EUR'
  status: 'pending' | 'completed' | 'refunded' | 'failed'
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'paypal'
  transactionId: string | null
  clientConfirmedAt: string | null
  moverConfirmedAt: string | null
  $createdAt: string
}
```

### `inventory_catalog` collection
```typescript
{
  $id: string
  itemId: string                     // unique slug e.g. 'sofa_2seater'
  name: string                       // display name
  category: string                   // slug e.g. 'living_room'
  widthCm: number
  heightCm: number
  depthCm: number
  weightKg: number
  moveClassificationWeight: number   // classification points
  moveTypeMinimum: 'light' | 'regular' | 'premium'
}
```

---

## 20. Real-Time Subscriptions

All Appwrite Realtime subscriptions use the Appwrite client SDK. For mobile use react-native-appwrite or the Appwrite SDK for your platform.

### Subscription Channel Format
```
databases.{databaseId}.collections.{collectionId}.documents
```

### Client App Subscriptions

| Screen | Channel | Purpose |
|---|---|---|
| My Moves | moves collection | Live status updates on move list |
| Move Details | moves collection | Status changes for current move |
| Live Tracking | mover_locations collection | Mover GPS position updates |
| Notification Bell | notifications collection | New notification badge count |
| All screens | moves collection | Trigger notification chime on status change |

### Subscription Event Shape
```typescript
{
  events: string[]     // e.g., ["databases.*.collections.*.documents.*.update"]
  payload: MoveDoc | MoverLocationDoc | NotificationDoc  // the updated document
}
```

### Connection Management
- Subscribe on screen mount, unsubscribe on unmount
- Subscribe only after user is authenticated
- Check `event.payload.clientId === currentUserId` to ensure relevance

---

## 21. Cloud Functions

These are called via Appwrite Functions SDK from the mobile app OR via Next.js API routes. For mobile, you can call cloud functions directly using the Appwrite Functions SDK.

### How to Call a Cloud Function (Appwrite SDK)
```typescript
const functions = new Functions(client)
const result = await functions.createExecution(
  functionId,
  JSON.stringify(payload),
  false  // async = false means wait for result
)
const response = JSON.parse(result.responseBody)
```

### Function IDs (from appwrite.config.json)
| Function Name | ID |
|---|---|
| `createmove` | `69959dce001b20e1acfe` |
| `calculateprice` | `6995a5400007207f0693` |
| `submitmoverprofile` | (see appwrite.config.json) |
| `adminverifymover` | (see appwrite.config.json) |
| `broadcastmoverequest` | (see appwrite.config.json) |
| `updatemoverlocation` | (see appwrite.config.json) |
| `updatemovestatus` | (see appwrite.config.json) |
| `processpayment` | (see appwrite.config.json) |
| `submitreview` | (see appwrite.config.json) |
| `sendnotification` | (see appwrite.config.json) |

**Note**: The web app primarily uses Next.js API routes (`/api/moves/create-instant`, etc.) rather than calling cloud functions directly. For the mobile app, you can call the same Next.js API routes (REST HTTP calls) or call cloud functions directly. The API routes are preferred since they handle auth validation, business logic, and are already tested.

---

## 22. Route Protection & Session Management

### 22.1 Protected Routes (require authentication + phoneVerified)
- `/account`
- `/move-choice`
- `/add-listing/*`
- `/instant-move/*`
- `/move-preview`
- `/checkout`
- `/pay-done`
- `/my-scheduled-moves`
- (+ all mover routes)

### 22.2 Mobile Auth Flow
1. Check if Appwrite session exists on app launch
2. If no session → show login/signup screens
3. After auth → call `POST /api/auth/sync-user` to ensure user doc exists
4. After sync → check `user.phoneVerified`
5. If `!phoneVerified` → redirect to phone verification flow
6. After phone verified → user can access protected screens

### 22.3 Session Cookie (Web-specific — for API calls from mobile)
The Next.js API routes check for a `picklt_session` HMAC-SHA256 signed cookie. For mobile app API calls, you need to authenticate via one of these methods:
- Pass the Appwrite JWT token in requests (if API routes are modified to accept JWT)
- Or create a proper mobile backend that uses the Appwrite Node.js server SDK directly

**Recommended approach for mobile**: Use Appwrite's mobile SDK for all direct Appwrite operations (reads, realtime), and call the Next.js API routes with a custom auth header that includes the Appwrite session token.

### 22.4 Auth State Check Pattern
```typescript
// On any protected screen:
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.replace('/login?type=client&redirect=' + currentPath)
  }
  if (!isLoading && isAuthenticated && !user?.phoneVerified) {
    router.replace('/login?type=client')  // phone verification step
  }
}, [isLoading, isAuthenticated, user?.phoneVerified])
```

---

## 23. Environment Variables

```env
# Appwrite (Public — safe to bundle in mobile app)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=698fcc80001f0b5149d8
NEXT_PUBLIC_APPWRITE_DATABASE_ID=<database-id>

# Collections (Public)
NEXT_PUBLIC_COLLECTION_MOVES=<collection-id>
NEXT_PUBLIC_COLLECTION_MOVE_REQUESTS=<collection-id>
NEXT_PUBLIC_COLLECTION_MOVER_LOCATIONS=<collection-id>
NEXT_PUBLIC_COLLECTION_NOTIFICATIONS=<collection-id>

# Storage Buckets (Public)
NEXT_PUBLIC_BUCKET_PROFILE_PHOTOS=<bucket-id>
NEXT_PUBLIC_BUCKET_MOVE_PHOTOS=<bucket-id>

# Cloud Functions (Public)
NEXT_PUBLIC_FUNCTION_CREATE_MOVE=69959dce001b20e1acfe
NEXT_PUBLIC_FUNCTION_CALCULATE_PRICE=6995a5400007207f0693
# ... other function IDs

# Maps
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<mapbox-token>

# Server-side only (NEVER bundle in mobile app)
APPWRITE_API_KEY=<server-api-key>
APPWRITE_DATABASE_ID=<database-id>
APPWRITE_COLLECTION_USERS=<collection-id>
APPWRITE_COLLECTION_MOVER_PROFILES=<collection-id>
APPWRITE_COLLECTION_CREW_MEMBERS=<collection-id>
APPWRITE_COLLECTION_MOVES=<collection-id>
APPWRITE_COLLECTION_MOVE_REQUESTS=<collection-id>
APPWRITE_COLLECTION_MOVER_LOCATIONS=<collection-id>
APPWRITE_COLLECTION_MOVE_STATUS_HISTORY=<collection-id>
APPWRITE_COLLECTION_PAYMENTS=<collection-id>
APPWRITE_COLLECTION_REVIEWS=<collection-id>
APPWRITE_COLLECTION_NOTIFICATIONS=<collection-id>
APPWRITE_COLLECTION_INVENTORY_CATALOG=<collection-id>
```

**For mobile**: Only use `NEXT_PUBLIC_*` variables (or their equivalents). Never embed server API keys.

---

## 24. Business Rules & Edge Cases

### 24.1 Move Type Rules
- A user can select a **lower** move type than recommended, but the system logs `systemMoveType` (the algorithm's result) separately. However, to prevent problems:
  - If any single item has `moveTypeMinimum = 'premium'`, the move **must** be premium
  - If any item has `moveTypeMinimum = 'regular'` and user selected `light`, warn them
- The backend re-runs classification on submission and stores both `moveType` (user's choice) and `systemMoveType` (algorithm's result)

### 24.2 Instant Move Rules
- Move type for instant moves is fully determined by the classification algorithm; the user-selected type from home search is a suggestion only
- At least 1 inventory item OR 1 custom item is required
- At least 1 photo is required
- Instant move requests expire in **3 minutes** (180 seconds) — mover must respond
- Only one mover can accept a given instant move (first to accept wins)

### 24.3 Scheduled Move Rules
- Move date must be a future date
- Contact information is required (name, phone, email)
- Terms and privacy policy must be accepted
- Move can be rescheduled only when status is `draft` or `booked`
- Move can be cancelled only when status is in: `draft`, `booked`, `pending_payment`, `paid`, `mover_assigned`, `mover_accepted`

### 24.4 Review Rules
- Only clients can leave reviews (not movers, not admins)
- Reviews can only be for `completed` moves
- Only one review per move per client
- Rating must be integer 1–5
- Reviews update the mover's `rating` average in real time

### 24.5 Payment Rules
- **Cash**: Client pays mover directly after move is complete; both parties confirm via the app
- **Card / PayPal**: Future implementation; currently the UI accepts these but doesn't process through a payment provider
- VAT rate: 19% (Germany)
- Currency: EUR

### 24.6 Photo Rules
- Photos are compressed before upload/storage
- Maximum ~5MB per original file
- Cover photo is the main image shown in listings
- Gallery photos are additional images
- For instant moves: photos shown to the mover before they accept so they know what to expect
- Photos stored in Appwrite Storage bucket `move-photos`

### 24.7 Profile Photo Rules
- Must be an image file
- Max 5MB original, compressed before upload
- Stored in Appwrite Storage bucket `profile-photos`
- URL format: `{APPWRITE_ENDPOINT}/storage/buckets/{BUCKET_ID}/files/{FILE_ID}/view?project={PROJECT_ID}`

### 24.8 Haltverbot (Germany-specific)
- "Haltverbot" means a temporary no-parking zone that must be arranged with local authorities before the move
- The platform tracks whether the client needs this arranged at pickup and/or dropoff
- This is metadata for the mover, not a service the platform provides directly

### 24.9 Client vs Mover Account Separation
- A `client` account cannot log into the mover portal (`/dashboard` etc.)
- A `mover` account can potentially also book moves as a client (subject to platform policy)
- The `userType` field on the `users` collection determines access
- When signing up, the user type is determined by the signup flow URL parameter (`?type=mover` or `?type=client`)

### 24.10 Draft Persistence
- Move draft is auto-saved to `localStorage` / `AsyncStorage` every 300ms
- If user closes the app mid-booking, data is restored on next launch
- Draft is cleared with `reset()` after successful booking
- `storedMoves` (completed bookings) persist independently and are not cleared by `reset()`

---

## 25. Pricing Formula

### 25.1 Instant Move Pricing (per mover)
```
distanceKm = routeDistanceMeters / 1000

// Per mover factors:
baseRate = mover.baseRatePerKm  // EUR/km, varies per mover (typical: 1.5–3.0)
baseFee = 25 EUR (flat)
crewSurcharge = (crewSize - 1) * 10 EUR
itemFeePerItem:
  truck:       2.0 EUR
  large_van:   2.5 EUR
  medium_van:  3.0 EUR
  small_van:   3.5 EUR (default)

price = baseFee + (distanceKm * baseRate) + crewSurcharge + (inventoryCount * itemFeePerItem)
totalPrice = Math.round(price)  // EUR, no tax breakdown shown to client in instant flow
```

### 25.2 Scheduled Move Pricing
```
// Base price by move type:
light:   99 EUR
regular: 199 EUR
premium: 299 EUR

// Add-ons:
packingPrice:
  none:       0 EUR
  partial:   150 EUR
  full:      250 EUR
  unpacking: 350 EUR

servicesPrice = additionalServices.length * 50 EUR  // per service

storagePrice = storageWeeks * 30 EUR  // per week

subtotal = basePrice + packingPrice + servicesPrice + storagePrice
tax = Math.round(subtotal * 0.19)   // 19% VAT
totalPrice = subtotal + tax
```

### 25.3 Price Display
- Always show prices in EUR with 2 decimal places (e.g., `€199.00`)
- Show line items: base price, packing, services, storage, VAT, total
- For instant moves: show the per-mover total price without line item breakdown (simpler UX)

---

## 26. Appwrite Storage — Photo URL Construction

### Profile Photos
```
{APPWRITE_ENDPOINT}/storage/buckets/{BUCKET_PROFILE_PHOTOS}/files/{fileId}/view?project={PROJECT_ID}
```

### Move Photos
```
{APPWRITE_ENDPOINT}/storage/buckets/{BUCKET_MOVE_PHOTOS}/files/{fileId}/view?project={PROJECT_ID}
```

### Notes
- Remove `mode=admin` from any URL before displaying (it's a dev-only param)
- Photos may be stored as base64 in context (before move creation) or as Appwrite file IDs (after upload)
- Always check if a string is a URL (starts with `http`) or a file ID before constructing URL

---

## 27. Navigation & Screen Map

### Client-Facing Screens (to build in mobile app)

| Screen | Route (web) | Description |
|---|---|---|
| Home / Search | `/` | Hero search form with pickup/dropoff/move type |
| Move Choice | `/move-choice` | Choose instant or scheduled |
| Instant — Inventory | `/instant-move/inventory` | Select items (instant flow step 1) |
| Instant — Photos | `/instant-move/photos` | Upload photos (instant flow step 2) |
| Instant — Select Mover | `/instant-move/select-mover` | Choose mover + see price (instant flow step 3) |
| Scheduled — Step 1 | `/add-listing/1` | Move details, date, home type |
| Scheduled — Step 2 | `/add-listing/2` | Pickup address details |
| Scheduled — Step 3 | `/add-listing/3` | Dropoff address details |
| Scheduled — Step 4 | `/add-listing/4` | Inventory selection |
| Scheduled — Step 5 | `/add-listing/5` | Packing services |
| Scheduled — Step 6 | `/add-listing/6` | Arrival time & preferences |
| Scheduled — Step 7 | `/add-listing/7` | Additional services, photos & contact |
| Move Preview | `/move-preview` | Full review before submission |
| Checkout | `/checkout` | Payment selection & confirmation |
| Pay Done | `/pay-done?handle=X&paymentMethod=Y` | Booking confirmation |
| Move Details | `/move-details/[handle]` | Single move detail + tracking |
| My Moves | `/my-scheduled-moves` | All moves list with filters |
| Account | `/account` | Profile management |
| Account — Password | `/account-password` | Change password |
| Account — Billing | `/account-billing` | Billing info (future) |
| Login | `/login?type=client` | Sign in (email or Google) |
| Signup | `/signup?type=client` | Register (email or Google) |
| Forgot Password | `/forgot-password` | Password reset |

---

## 28. Key Integration Notes for Mobile

### 28.1 Appwrite SDK Setup
```typescript
// Use the official Appwrite React Native SDK
import { Client, Account, Databases, Storage, Functions, Realtime } from 'react-native-appwrite'

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('698fcc80001f0b5149d8')
  .setPlatform('io.picklt.app')  // your mobile app bundle ID
```

### 28.2 Auth Session Persistence
- Appwrite React Native SDK automatically persists sessions using AsyncStorage
- Sessions last 1 year (31,536,000 seconds per appwrite.config.json)

### 28.3 API Base URL
The Next.js API routes (backend) are deployed alongside the web app. For mobile, use the same base URL:
```
https://<your-domain>/api/*
```

### 28.4 Draft State Storage (AsyncStorage Keys)
```
picklt_move_draft       → Current in-progress move data (MoveSearchState without storedMoves)
picklt_stored_moves     → Array of confirmed moves (StoredMove[])
picklt_pending_user_type → Temporarily stores 'client' or 'mover' during OAuth flow
```

### 28.5 Image Compression
Before uploading any image:
- Compress to target max quality (e.g., 70-80% JPEG quality)
- Target max file size: ~500KB after compression
- Use platform-appropriate image compression (e.g., react-native-image-resizer or expo-image-manipulator)

### 28.6 Move Handle Formats
- Instant move handles: `IM-<base36-timestamp-uppercase>` (e.g., `IM-LK4A2B`)
- Scheduled move handles: `SM-<base36-timestamp-uppercase>` (e.g., `SM-LK4A2B`)
- These are human-readable booking codes shown to users

### 28.7 Inventory JSON Storage
The `inventoryItems` field in the database is a JSON string:
```json
{"sofa_2seater": 1, "bed_160": 2, "wardrobe_medium": 1}
```
Parse with `JSON.parse(doc.inventoryItems)` before use.

Custom items are stored as an array of JSON strings:
```json
["[{\"id\":\"custom_1\",\"name\":\"Fish tank\",\"quantity\":1,\"approxSize\":\"large\",\"approxWeight\":\"40kg\"}]"]
```

### 28.8 Date Handling
- Dates are stored as ISO 8601 strings: `"2026-05-15"` (date) or `"2026-05-15T09:00:00.000Z"` (datetime)
- Display dates in locale `en-GB` format: "Monday, 15 May 2026"
- Arrival time stored as 24h string: `"09:00"`, display in 12h: `"9:00 AM"`

---

## 29. Error Handling Patterns

### Validation Errors (client-side)
- Form field errors stored as `Record<string, string>` keyed by field name
- Shown inline below the relevant field in red text
- Clear errors on successful submission

### API Error Response Format
```typescript
{ error: string }  // 4xx/5xx responses
{ success: true, ...data }  // 2xx responses
```

### Common Error Messages to Handle
- `"Unauthorized"` (401) → redirect to login
- `"Forbidden"` (403) → show "You don't have permission" message
- `"Not authorized for this move"` (403) → show generic error
- `"Move is not completed"` → toast "Can only review completed moves"
- `"Review already submitted"` (409) → toast "Already reviewed"
- `"Cannot cancel a move with status X"` → toast explaining why
- `"Move date must be in the future"` → inline error on date field

### Network Errors
- Show retry option for failed API calls
- For realtime disconnections, show "Reconnecting..." indicator

---

## 30. UI/UX Patterns from Web App

### 30.1 Move Status Badge Colors
```
pending    → yellow/amber
in_progress → blue
completed  → green
cancelled  → red
```

### 30.2 Move Type Badge Colors
```
light   → green
regular → blue
premium → purple/indigo
```

### 30.3 Key UI Components to Replicate
- **NcInputNumber** — Quantity stepper with +/- buttons (used for inventory)
- **GallerySlider** — Horizontal photo carousel for move cards
- **MoveCard** — Move summary card for My Moves list
- **Badge** — Status/type badge with color variants
- **AuthGate** — Wrapper component that redirects to login if not authenticated

### 30.4 Loading States
- Skeleton loaders for move cards (animate-pulse, gray rectangles)
- Spinner for button submission states
- "Loading..." text for full-page loads

### 30.5 Notification Sound
A 3-note ascending chime (C5→E5→G5) is played when a move status changes. For mobile, trigger a system notification sound or short custom audio clip.

### 30.6 Pull-to-Refresh
The My Moves screen should support pull-to-refresh (calls `GET /api/moves` again).

---

*This PRD was generated from a complete analysis of all source files in the PickLT web application as of April 21, 2026. It captures every business rule, data model, API contract, and behavioral pattern needed to build the client-facing mobile application.*

