# PickLT Backend Architecture — Complete Documentation

## Table of Contents
1. [Overview & Technology Stack](#1-overview--technology-stack)
2. [Appwrite Setup & Configuration](#2-appwrite-setup--configuration)
3. [Authentication Flow](#3-authentication-flow)
4. [Database Schema — Collections & Relationships](#4-database-schema--collections--relationships)
5. [Move Classification Algorithm](#5-move-classification-algorithm)
6. [Real-Time Mover Tracking](#6-real-time-mover-tracking)
7. [Cloud Functions vs. Next.js API Routes](#7-cloud-functions-vs-nextjs-api-routes)
8. [Cloud Functions Catalog](#8-cloud-functions-catalog)
9. [Implementation Roadmap](#9-implementation-roadmap)

---

## 1. Overview & Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React, Tailwind CSS |
| Auth | Appwrite Authentication (Email/Password + Google OAuth) |
| Database | Appwrite Database (collections with relationships) |
| File Storage | Appwrite Storage (profile photos, move photos) |
| Real-time | Appwrite Realtime (mover location, move status) |
| Cloud Functions | Appwrite Cloud Functions (Node.js runtime) |
| Maps | Mapbox GL JS (geocoding, routing, real-time tracking) |
| API Routes | Next.js API routes (read-heavy operations, SSR data) |

### Architecture Principle
- **Cloud Functions** → All database **write** operations (create, update, delete)
- **Next.js API Routes / SSR** → All **read** operations, page data fetching, server-side validation
- **Appwrite Realtime** → Live subscriptions for mover GPS, move status changes, new move requests

---

## 2. Appwrite Setup & Configuration

### Services to Enable in Appwrite Console
1. **Authentication**
   - Email/Password provider ✅
   - Google OAuth provider ✅
   - Email verification ✅
   - Phone verification (via SMS) ✅

2. **Database** — Project: `picklt`
3. **Storage** — Buckets: `profile-photos`, `move-photos`
4. **Functions** — Node.js 18 runtime
5. **Realtime** — Enabled on collections: `mover_locations`, `moves`, `move_requests`

### Environment Variables Required
```env
# Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<project-id>
APPWRITE_API_KEY=<server-api-key>
APPWRITE_DATABASE_ID=picklt
APPWRITE_FUNCTION_API_KEY=<function-api-key>

# Mapbox
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<mapbox-token>

# Google OAuth
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
```

---

## 3. Authentication Flow

### 3.1 Client Authentication Flow

```
Home Page (unauthenticated)
  ├── Select pickup location ✅
  ├── Select dropoff location ✅
  ├── Select move type ✅
  └── Click "Search" → /move-choice
       └── Click "Instant Move" or "Book for Future"
            └── IF not authenticated:
                 ├── Show Auth Modal (overlay, preserves state)
                 │    ├── Email/Password Sign Up
                 │    ├── Email/Password Sign In
                 │    ├── Google OAuth (one-tap)
                 │    └── Email verification prompt
                 └── AFTER auth completes:
                      ├── Context state preserved (pickup, dropoff, moveType)
                      ├── Populate contact info from user profile
                      └── Continue to the exact page they were going to
```

### 3.2 Client Auth — Implementation Details

1. **Pre-auth data preservation**: All move data is stored in the `useMoveSearch` React context (in-memory) — this persists across the auth modal since it's an overlay, not a redirect.

2. **Auth Modal** (new component: `AuthModal.tsx`):
   - Rendered as a dialog overlay
   - Tabs: "Sign In" | "Sign Up"
   - Sign In: Email + Password, Google OAuth button
   - Sign Up: Full Name, Email, Phone, Password, confirm Password
   - After successful auth → close modal → user continues where they left off

3. **Google OAuth flow**:
   - Uses Appwrite's `account.createOAuth2Session('google', successUrl, failureUrl)`
   - On success → Appwrite creates/links user → redirect back to app
   - The app reads the session and populates user context

4. **Email Verification**:
   - After signup, call `account.createVerification(verifyUrl)`
   - User clicks link in email → `account.updateVerification(userId, secret)`
   - Non-blocking: user can continue using the app but some actions require verification

5. **Auto-populate contact info** (Step 7 in booking flow / instant move):
   - After login, `contactInfo` in `useMoveSearch` is auto-filled from the user's profile
   - User can override if booking for someone else

### 3.3 Mover Authentication Flow

```
Mover Login Page (/login?type=mover)
  ├── Email/Password Sign In
  ├── Google OAuth
  └── AFTER auth:
       ├── Check if user has mover profile → redirect to /dashboard
       └── IF no mover profile:
            └── Mover Onboarding Flow:
                 ├── Step 1: Personal Info (name, phone, photo)
                 ├── Step 2: Vehicle Info (brand, model, year, capacity, registration)
                 ├── Step 3: Driver's License upload
                 ├── Step 4: Background check consent
                 └── Submit → status = "pending_verification"
                      └── Admin reviews → status = "verified" | "rejected"
```

### 3.4 Mover Verification Statuses
| Status | Access |
|---|---|
| `pending_verification` | Can view dashboard but cannot accept moves |
| `verified` | Full access — can accept moves |
| `suspended` | Account suspended by admin |
| `rejected` | Application rejected — can reapply |

---

## 4. Database Schema — Collections & Relationships

### Collection: `users`
| Field | Type | Description |
|---|---|---|
| `$id` | string | Appwrite auto-generated |
| `email` | string | Unique, required |
| `fullName` | string | Required |
| `phone` | string | Optional |
| `profilePhoto` | string | Storage file ID |
| `userType` | enum | `client` \| `mover` |
| `emailVerified` | boolean | Default: false |
| `phoneVerified` | boolean | Default: false |
| `createdAt` | datetime | Auto |
| `updatedAt` | datetime | Auto |

**Relationships:**
- `users` → `mover_profiles` (ONE-TO-ONE, two-way) — only for movers
- `users` → `moves` (ONE-TO-MANY, two-way) — as client
- `users` → `reviews` (ONE-TO-MANY, one-way) — reviews written

---

### Collection: `mover_profiles`
| Field | Type | Description |
|---|---|---|
| `$id` | string | Auto |
| `userId` | string | **Relationship → users** (two-way) |
| `driversLicense` | string | Storage file ID |
| `vehicleBrand` | string | |
| `vehicleModel` | string | |
| `vehicleYear` | string | |
| `vehicleCapacity` | string | kg capacity |
| `vehicleRegistration` | string | Plate number |
| `vehicleType` | enum | `small_van` \| `medium_truck` \| `large_truck` |
| `rating` | float | Computed average |
| `totalMoves` | integer | Counter |
| `yearsExperience` | integer | |
| `verificationStatus` | enum | `pending_verification` \| `verified` \| `suspended` \| `rejected` |
| `isOnline` | boolean | Whether mover is currently accepting moves |
| `currentLatitude` | float | Real-time GPS |
| `currentLongitude` | float | Real-time GPS |
| `languages` | string[] | Array of languages spoken |
| `baseRate` | float | Per-km base rate in EUR |
| `createdAt` | datetime | |

**Relationships:**
- `mover_profiles` → `users` (ONE-TO-ONE, two-way)
- `mover_profiles` → `crew_members` (ONE-TO-MANY, two-way)
- `mover_profiles` → `moves` (ONE-TO-MANY, two-way) — as assigned mover
- `mover_profiles` → `mover_locations` (ONE-TO-MANY, one-way) — GPS history

---

### Collection: `crew_members`
| Field | Type | Description |
|---|---|---|
| `$id` | string | Auto |
| `moverProfileId` | string | **Relationship → mover_profiles** (two-way) |
| `name` | string | |
| `phone` | string | |
| `photo` | string | Storage file ID |
| `role` | enum | `driver` \| `helper` |
| `isActive` | boolean | |

---

### Collection: `moves`
This is the central collection that tracks all moves (both instant and scheduled).

| Field | Type | Description |
|---|---|---|
| `$id` | string | Auto |
| `handle` | string | Unique readable ID (e.g., `MV-2026-001234`) |
| `clientId` | string | **Relationship → users** (two-way) |
| `moverProfileId` | string \| null | **Relationship → mover_profiles** (two-way) |
| `status` | enum | See status table below |
| `moveCategory` | enum | `instant` \| `scheduled` |
| `moveType` | enum | `light` \| `regular` \| `premium` |
| `systemMoveType` | enum | `light` \| `regular` \| `premium` — auto-classified |
| `moveDate` | datetime \| null | For scheduled moves |
| **Pickup** | | |
| `pickupLocation` | string | Full address |
| `pickupLatitude` | float | |
| `pickupLongitude` | float | |
| `pickupStreetAddress` | string | |
| `pickupApartmentUnit` | string | |
| `pickupFloorLevel` | string | |
| `pickupElevator` | boolean | |
| `pickupParking` | string | |
| `pickupHaltverbot` | boolean | |
| **Dropoff** | | |
| `dropoffLocation` | string | Full address |
| `dropoffLatitude` | float | |
| `dropoffLongitude` | float | |
| `dropoffStreetAddress` | string | |
| `dropoffApartmentUnit` | string | |
| `dropoffFloorLevel` | string | |
| `dropoffElevator` | boolean | |
| `dropoffParking` | string | |
| `dropoffHaltverbot` | boolean | |
| **Home/Property** | | |
| `homeType` | enum | `apartment` \| `house` \| `office` \| `storage` |
| **Inventory** | | |
| `inventoryItems` | string (JSON) | `Record<string, number>` — itemId → quantity |
| `customItems` | string (JSON) | `CustomItem[]` |
| `totalItemCount` | integer | Computed |
| `totalWeightKg` | float | Computed from item metadata |
| `totalVolumeCm3` | float | Computed from item metadata |
| **Packing** | | |
| `packingServiceLevel` | enum | `none` \| `partial` \| `full` \| `unpacking` |
| `packingMaterials` | string[] | Array of material IDs |
| `packingNotes` | string | |
| **Timing** | | |
| `arrivalWindow` | string | e.g., "09:00" |
| `flexibility` | enum | `flexible_1hr` \| `not_flexible` |
| **Crew & Vehicle** | | |
| `crewSize` | string | `1` \| `2` \| `3` \| `4plus` |
| `vehicleType` | string | |
| **Services** | | |
| `additionalServices` | string[] | Array of service IDs |
| `storageWeeks` | integer | 0 if not needed |
| **Photos** | | |
| `coverPhotoId` | string | Storage file ID |
| `galleryPhotoIds` | string[] | Storage file IDs |
| **Contact** | | |
| `contactFullName` | string | |
| `contactPhone` | string | |
| `contactEmail` | string | |
| `contactNotes` | string | |
| `isBusinessMove` | boolean | |
| `companyName` | string | |
| `vatId` | string | |
| **Pricing** | | |
| `estimatedPrice` | float | System-calculated |
| `finalPrice` | float | After mover confirms |
| `routeDistanceMeters` | float | Mapbox route distance |
| `routeDurationSeconds` | float | Mapbox route duration |
| **Legal** | | |
| `termsAccepted` | boolean | |
| `privacyAccepted` | boolean | |
| **Timestamps** | | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |
| `paidAt` | datetime \| null | |
| `completedAt` | datetime \| null | |

**Relationships:**
- `moves` → `users` (MANY-TO-ONE, two-way) — client
- `moves` → `mover_profiles` (MANY-TO-ONE, two-way) — assigned mover
- `moves` → `move_status_history` (ONE-TO-MANY, one-way)
- `moves` → `reviews` (ONE-TO-ONE, one-way)

### Move Statuses
| Status | Description |
|---|---|
| `draft` | Client started creating but hasn't submitted |
| `pending_payment` | Awaiting payment |
| `paid` | Payment received, awaiting mover assignment |
| `mover_assigned` | Mover has been selected/assigned |
| `mover_accepted` | Mover accepted the job |
| `mover_en_route` | Mover is driving to pickup (GPS tracked) |
| `mover_arrived` | Mover arrived at pickup |
| `loading` | Loading items |
| `in_transit` | Driving to dropoff (GPS tracked) |
| `arrived_destination` | Arrived at dropoff |
| `unloading` | Unloading items |
| `completed` | Move finished |
| `cancelled_by_client` | Client cancelled |
| `cancelled_by_mover` | Mover cancelled |
| `disputed` | Under dispute resolution |

---

### Collection: `move_requests`
For instant moves — the broadcast to nearby movers.

| Field | Type | Description |
|---|---|---|
| `$id` | string | Auto |
| `moveId` | string | **Relationship → moves** (one-way) |
| `moverProfileId` | string | **Relationship → mover_profiles** (one-way) |
| `status` | enum | `pending` \| `accepted` \| `declined` \| `expired` |
| `sentAt` | datetime | |
| `respondedAt` | datetime \| null | |
| `expiresAt` | datetime | Auto-expire after 60 seconds |

**Relationships:**
- `move_requests` → `moves` (MANY-TO-ONE, one-way)
- `move_requests` → `mover_profiles` (MANY-TO-ONE, one-way)

---

### Collection: `mover_locations`
Real-time GPS tracking during active moves.

| Field | Type | Description |
|---|---|---|
| `$id` | string | Auto |
| `moverProfileId` | string | **Relationship → mover_profiles** (one-way) |
| `moveId` | string | **Relationship → moves** (one-way) |
| `latitude` | float | |
| `longitude` | float | |
| `heading` | float | Compass direction in degrees |
| `speed` | float | km/h |
| `timestamp` | datetime | |

---

### Collection: `move_status_history`
Audit trail for move status changes.

| Field | Type | Description |
|---|---|---|
| `$id` | string | Auto |
| `moveId` | string | **Relationship → moves** (one-way) |
| `fromStatus` | string | |
| `toStatus` | string | |
| `changedBy` | string | User ID |
| `changedAt` | datetime | |
| `note` | string | Optional reason |

---

### Collection: `payments`
| Field | Type | Description |
|---|---|---|
| `$id` | string | Auto |
| `moveId` | string | **Relationship → moves** (one-way) |
| `clientId` | string | **Relationship → users** (one-way) |
| `amount` | float | EUR |
| `currency` | string | Default: `EUR` |
| `status` | enum | `pending` \| `completed` \| `refunded` \| `failed` |
| `paymentMethod` | string | `card` \| `paypal` \| `bank_transfer` |
| `transactionId` | string | External payment provider reference |
| `createdAt` | datetime | |

---

### Collection: `reviews`
| Field | Type | Description |
|---|---|---|
| `$id` | string | Auto |
| `moveId` | string | **Relationship → moves** (one-way) |
| `reviewerId` | string | **Relationship → users** (one-way) |
| `moverProfileId` | string | **Relationship → mover_profiles** (one-way) |
| `rating` | integer | 1–5 |
| `comment` | string | |
| `createdAt` | datetime | |

---

### Collection: `notifications`
| Field | Type | Description |
|---|---|---|
| `$id` | string | Auto |
| `userId` | string | **Relationship → users** (one-way) |
| `type` | enum | `move_request` \| `move_accepted` \| `mover_arrived` \| `move_completed` \| `payment` \| `review` \| `system` |
| `title` | string | |
| `body` | string | |
| `data` | string (JSON) | Extra payload (e.g., moveId) |
| `isRead` | boolean | Default: false |
| `createdAt` | datetime | |

---

### Collection: `inventory_catalog`
Server-side catalog of items with classification weights (used by the algorithm).

| Field | Type | Description |
|---|---|---|
| `$id` | string | Auto |
| `itemId` | string | Unique key (e.g., `sofa_3seater`) |
| `name` | string | Display name |
| `category` | string | `living_room`, `bedroom`, etc. |
| `widthCm` | integer | |
| `heightCm` | integer | |
| `depthCm` | integer | |
| `weightKg` | float | |
| `moveClassificationWeight` | float | **Points** for classification algorithm |
| `moveTypeMinimum` | enum | `light` \| `regular` \| `premium` — minimum move type for this item |

---

### Relationship Summary Diagram

```
users ──(1:1)──── mover_profiles ──(1:N)──── crew_members
  │                    │
  │(1:N)               │(1:N)
  ▼                    ▼
moves ◄────────────────┘
  │
  ├──(1:N)── move_status_history
  ├──(1:N)── move_requests ──(N:1)── mover_profiles
  ├──(1:1)── reviews
  ├──(1:N)── payments
  └──(1:N)── mover_locations
  
users ──(1:N)── notifications
```

---

## 5. Move Classification Algorithm

### 5.1 Overview

Each inventory item has a **classification weight** (points). The total points determine the move type. The system monitors item selections in real-time and warns/auto-upgrades the move type.

### 5.2 Classification Weight Table

| Item | Weight (kg) | Volume Points | Classification Points | Min Move Type |
|---|---|---|---|---|
| Cardboard boxes | 20 | 2 | 2 | light |
| Suitcases | 25 | 2 | 2 | light |
| Lamp | 8 | 1 | 1 | light |
| Plants | 10 | 1 | 1 | light |
| Microwave | 15 | 2 | 2 | light |
| Nightstand | 15 | 2 | 2 | light |
| Chairs (each) | 5 | 1 | 1 | light |
| Mirror | 20 | 1 | 2 | light |
| Rug | 15 | 2 | 2 | light |
| Coffee table | 20 | 3 | 3 | light |
| TV | 15 | 2 | 2 | light |
| TV stand | 30 | 4 | 4 | regular |
| Office chair | 15 | 2 | 2 | light |
| Office desk | 35 | 5 | 5 | regular |
| Armchair | 25 | 4 | 4 | regular |
| Bookshelf | 40 | 5 | 5 | regular |
| Filing cabinet | 35 | 4 | 4 | regular |
| Bicycle | 15 | 4 | 3 | light |
| Sofa (2-seater) | 45 | 8 | 8 | regular |
| Sofa (3-seater) | 65 | 12 | 12 | regular |
| Bed (90 cm) | 35 | 6 | 6 | regular |
| Bed (140 cm) | 50 | 8 | 8 | regular |
| Bed (160 cm) | 60 | 10 | 10 | regular |
| Mattress | 30 | 5 | 5 | regular |
| Dining table (small) | 30 | 5 | 5 | regular |
| Dining table (large) | 50 | 8 | 8 | regular |
| Fridge (small) | 35 | 3 | 4 | regular |
| Fridge (medium) | 55 | 5 | 6 | regular |
| Fridge (large) | 90 | 8 | 10 | premium |
| Dishwasher | 45 | 4 | 5 | regular |
| Wardrobe (small) | 60 | 8 | 8 | regular |
| Wardrobe (medium) | 80 | 12 | 12 | premium |
| Wardrobe (large) | 120 | 18 | 18 | premium |
| Piano | 250 | 20 | 25 | premium |
| Safe | 150 | 8 | 20 | premium |
| Treadmill | 100 | 12 | 15 | premium |
| Aquarium | 80 | 8 | 12 | premium |
| Glass cabinet | 60 | 10 | 10 | premium |
| Artwork / Fragile | 15 | 3 | 5 | regular |

### 5.3 Move Type Thresholds

| Move Type | Total Points Range | Max Weight (kg) | Max Items | Description |
|---|---|---|---|---|
| **Light** | 0 – 25 | ≤ 200 | ≤ 15 | Small load — few items, studio/single room |
| **Regular** | 26 – 80 | ≤ 800 | ≤ 40 | Standard household — 2–3 bedroom |
| **Premium** | 81+ | > 800 | > 40 | Full-service — large home, special items |

### 5.4 Algorithm Logic (Frontend + Backend)

```typescript
// Shared utility: classifyMove()
type MoveClassification = {
  recommendedType: 'light' | 'regular' | 'premium'
  totalPoints: number
  totalWeightKg: number
  totalItems: number
  warnings: string[]
  requiresUpgrade: boolean
  upgradeFrom?: string
  upgradeTo?: string
}

function classifyMove(
  inventory: Record<string, number>,
  customItems: CustomItem[],
  currentMoveType: 'light' | 'regular' | 'premium',
  itemCatalog: InventoryItemDef[]
): MoveClassification {
  let totalPoints = 0
  let totalWeightKg = 0
  let totalItems = 0
  const warnings: string[] = []
  
  // Calculate from catalog items
  for (const [itemId, quantity] of Object.entries(inventory)) {
    if (quantity <= 0) continue
    const item = itemCatalog.find(i => i.id === itemId)
    if (!item) continue
    
    const points = getClassificationPoints(item)
    totalPoints += points * quantity
    totalWeightKg += item.meta.weightKg * quantity
    totalItems += quantity
    
    // Check if any single item exceeds current move type
    if (item.moveTypeMinimum === 'premium' && currentMoveType !== 'premium') {
      warnings.push(`"${item.name}" requires at least a Premium move`)
    } else if (item.moveTypeMinimum === 'regular' && currentMoveType === 'light') {
      warnings.push(`"${item.name}" requires at least a Regular move`)
    }
  }
  
  // Add estimated points for custom items
  for (const custom of customItems) {
    totalItems += custom.quantity
    totalPoints += 3 * custom.quantity // Default 3 points per custom item
    totalWeightKg += 20 * custom.quantity // Estimate 20kg per custom item
  }
  
  // Determine recommended type
  let recommendedType: 'light' | 'regular' | 'premium' = 'light'
  if (totalPoints > 80 || totalWeightKg > 800 || totalItems > 40) {
    recommendedType = 'premium'
  } else if (totalPoints > 25 || totalWeightKg > 200 || totalItems > 15) {
    recommendedType = 'regular'
  }
  
  // Check if upgrade needed
  const typeOrder = { light: 0, regular: 1, premium: 2 }
  const requiresUpgrade = typeOrder[recommendedType] > typeOrder[currentMoveType]
  
  // Warning thresholds (80% of next tier)
  if (currentMoveType === 'light' && totalPoints > 20) {
    warnings.push('You are approaching the limit for a Light move')
  }
  if (currentMoveType === 'regular' && totalPoints > 64) {
    warnings.push('You are approaching the limit for a Regular move')
  }
  
  return {
    recommendedType,
    totalPoints,
    totalWeightKg,
    totalItems,
    warnings,
    requiresUpgrade,
    upgradeFrom: requiresUpgrade ? currentMoveType : undefined,
    upgradeTo: requiresUpgrade ? recommendedType : undefined,
  }
}
```

### 5.5 Frontend Behavior

1. **On every item quantity change** → run `classifyMove()` 
2. **Warning Modal** → Show when `warnings.length > 0` and approaching threshold
3. **Auto-Upgrade Modal** → Show when `requiresUpgrade === true`:
   - "Your selected items exceed a {moveType} move. We've upgraded your move to {recommendedType}."
   - User acknowledges → move type updated in context
4. This runs both in `/add-listing/4` (scheduled) and `/instant-move/inventory` (instant)

### 5.6 Backend Validation (Cloud Function)

When the move is submitted, the cloud function re-runs `classifyMove()` server-side with the authoritative `inventory_catalog` collection data. If the client's `moveType` doesn't match, the server overrides it with `systemMoveType`.

---

## 6. Real-Time Mover Tracking

### 6.1 Architecture (Uber/Bolt-style)

```
[Mover's Device]                    [Appwrite]                     [Client's Device]
     │                                   │                               │
     ├─ GPS watch (every 3s) ──────────► │                               │
     │  POST /functions/update-location  │                               │
     │                                   ├─ Write to mover_locations ──► │
     │                                   │   (Realtime subscription)     │
     │                                   │                               ├─ Update map marker
     │                                   │                               │
```

### 6.2 Mover Side
- **Cloud Function: `update-mover-location`**
  - Called every 3 seconds from mover's device using `navigator.geolocation.watchPosition()`
  - Writes to `mover_locations` collection AND updates `mover_profiles.currentLatitude/Longitude`
  - Only active during an active move (`mover_en_route` or `in_transit` status)

### 6.3 Client Side
- **Appwrite Realtime Subscription**:
  ```typescript
  // Subscribe to location updates for the assigned mover
  const unsubscribe = client.subscribe(
    `databases.picklt.collections.mover_locations.documents`,
    (response) => {
      if (response.payload.moveId === currentMoveId) {
        setMoverCoords({
          latitude: response.payload.latitude,
          longitude: response.payload.longitude,
        })
      }
    }
  )
  ```
- The Mapbox map updates the mover marker position smoothly using `flyTo` or marker animation

### 6.4 Move Request Pop-up (Mover Side)
- **Appwrite Realtime Subscription** on `move_requests` collection
- When a new document is created with `moverProfileId === currentMover.id`:
  - Show a full-screen overlay pop-up with move details
  - Accept / Decline buttons
  - Auto-decline after 60 seconds
- On accept → Cloud Function updates `move_requests.status = 'accepted'` and `moves.status = 'mover_accepted'`

---

## 7. Cloud Functions vs. Next.js API Routes

### Decision Matrix

| Operation | Where | Reason |
|---|---|---|
| **Auth: Sign up** | Next.js API Route | Server-side Appwrite SDK, session management |
| **Auth: Sign in** | Next.js API Route | Session cookies, server validation |
| **Auth: Google OAuth** | Client-side Appwrite SDK | Redirect-based flow |
| **Auth: Email verification** | Cloud Function | Triggered by Appwrite event |
| **Auth: Phone verification** | Cloud Function | SMS sending via Appwrite |
| **Create move** | Cloud Function: `create-move` | Validates, classifies, writes DB |
| **Update move status** | Cloud Function: `update-move-status` | Business logic, triggers notifications |
| **Update mover location** | Cloud Function: `update-mover-location` | High-frequency writes, needs auth |
| **Accept/decline move request** | Cloud Function: `respond-move-request` | Atomic updates, notification triggers |
| **Process payment** | Cloud Function: `process-payment` | Sensitive, server-only |
| **Submit mover profile** | Cloud Function: `submit-mover-profile` | Validation, file processing |
| **Verify mover (admin)** | Cloud Function: `admin-verify-mover` | Admin-only action |
| **Upload photos** | Next.js API Route | Proxy to Appwrite Storage |
| **Get moves list (client)** | Next.js API Route (SSR) | Page data, caching |
| **Get available moves (mover)** | Next.js API Route (SSR) | Page data, geo-filtering |
| **Get mover dashboard data** | Next.js API Route (SSR) | Aggregated data |
| **Get move details** | Next.js API Route (SSR) | Single document read |
| **Search movers (nearby)** | Next.js API Route | Geo-query with Mapbox |
| **Calculate move price** | Cloud Function: `calculate-price` | Complex pricing logic |
| **Send notification** | Cloud Function: `send-notification` | Triggered by status changes |
| **Submit review** | Cloud Function: `submit-review` | Updates mover rating |
| **Get user profile** | Next.js API Route (SSR) | Simple read |

---

## 8. Cloud Functions Catalog

Each function below needs to be created in the Appwrite Console and linked to the project.

### 8.1 `create-move`
- **Trigger**: HTTP (POST)
- **Purpose**: Create a new move document with full validation
- **Logic**:
  1. Validate all required fields
  2. Run `classifyMove()` to set `systemMoveType`
  3. Calculate estimated price
  4. Create document in `moves` collection
  5. Create initial `move_status_history` entry
  6. Return move document

### 8.2 `update-move-status`
- **Trigger**: HTTP (POST)
- **Purpose**: Transition a move between statuses
- **Logic**:
  1. Validate status transition is allowed
  2. Update `moves.status`
  3. Create `move_status_history` entry
  4. Create `notifications` for relevant users
  5. If status = `completed` → trigger review request

### 8.3 `update-mover-location`
- **Trigger**: HTTP (POST)
- **Purpose**: GPS tracking during active moves
- **Logic**:
  1. Validate mover has an active move
  2. Write to `mover_locations`
  3. Update `mover_profiles.currentLatitude/Longitude`
  4. (Realtime will auto-broadcast to subscribers)

### 8.4 `respond-move-request`
- **Trigger**: HTTP (POST)
- **Purpose**: Mover accepts or declines a move request
- **Logic**:
  1. Update `move_requests.status`
  2. If accepted:
     - Update `moves.moverProfileId` and `moves.status = 'mover_accepted'`
     - Decline all other pending requests for this move
     - Notify client
  3. If declined:
     - Check if other movers are available
     - Notify client if no movers left

### 8.5 `calculate-price`
- **Trigger**: HTTP (POST)
- **Purpose**: Calculate move price based on distance, items, services
- **Logic**:
  1. Get route distance/duration from Mapbox
  2. Calculate base price from distance × mover's rate
  3. Add surcharges for: floor level (no elevator), special items, packing services, additional services
  4. Apply move type multiplier (light: 1.0, regular: 1.3, premium: 1.8)
  5. Return price breakdown

### 8.6 `process-payment`
- **Trigger**: HTTP (POST)
- **Purpose**: Handle payment processing
- **Logic**:
  1. Validate payment details
  2. Process via payment provider
  3. Create `payments` document
  4. Update `moves.status = 'paid'`
  5. Generate booking code

### 8.7 `submit-mover-profile`
- **Trigger**: HTTP (POST)
- **Purpose**: Mover registration/onboarding
- **Logic**:
  1. Validate mover data and documents
  2. Create `mover_profiles` document with `status = 'pending_verification'`
  3. Notify admins of new mover application

### 8.8 `admin-verify-mover`
- **Trigger**: HTTP (POST)
- **Purpose**: Admin approves/rejects mover applications
- **Logic**:
  1. Validate admin permissions
  2. Update `mover_profiles.verificationStatus`
  3. Notify mover of result

### 8.9 `send-notification`
- **Trigger**: Appwrite Event (document create on `move_status_history`)
- **Purpose**: Auto-send notifications on status changes
- **Logic**:
  1. Determine notification type from status change
  2. Create `notifications` document
  3. Send push notification (if implemented)
  4. Send email for important events (move completed, payment received)

### 8.10 `submit-review`
- **Trigger**: HTTP (POST)
- **Purpose**: Client submits a review after move completion
- **Logic**:
  1. Validate move is completed and client hasn't reviewed yet
  2. Create `reviews` document
  3. Recalculate mover's average rating
  4. Update `mover_profiles.rating`

### 8.11 `broadcast-move-request`
- **Trigger**: HTTP (POST) — called after payment for instant moves
- **Purpose**: Find nearby movers and send them the move request
- **Logic**:
  1. Query `mover_profiles` where `isOnline = true` and `verificationStatus = 'verified'`
  2. Filter by proximity to pickup location (within 15km)
  3. Sort by distance
  4. Create `move_requests` documents for top 10 nearest movers
  5. Set `expiresAt` to 60 seconds from now

### 8.12 `expire-move-requests`
- **Trigger**: Scheduled (CRON every 30 seconds)
- **Purpose**: Auto-expire unanswered move requests
- **Logic**:
  1. Query `move_requests` where `status = 'pending'` and `expiresAt < now`
  2. Update status to `expired`

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Auth + Core DB)
1. Set up Appwrite project, database, storage buckets
2. Create all collections with proper schemas and indexes
3. Set up relationships between collections
4. Implement client auth (email/password + Google OAuth)
5. Create `AuthModal` component
6. Implement email verification flow
7. Set up Appwrite SDK in Next.js (client + server)

### Phase 2: Move Creation Flow
1. Create `create-move` cloud function
2. Create `calculate-price` cloud function
3. Implement `classifyMove()` utility (shared frontend/backend)
4. Add real-time classification warnings to inventory steps
5. Connect add-listing flow to backend (save moves)
6. Connect instant-move flow to backend

### Phase 3: Mover Side
1. Implement mover registration/onboarding flow
2. Create `submit-mover-profile` cloud function
3. Create `admin-verify-mover` cloud function
4. Build available moves listing from database
5. Create `broadcast-move-request` cloud function
6. Implement move request pop-up with Realtime

### Phase 4: Real-Time Tracking
1. Create `update-mover-location` cloud function
2. Implement GPS tracking on mover's device
3. Set up Realtime subscription on client side
4. Animate mover marker on Mapbox map
5. Create `update-move-status` cloud function
6. Implement status transitions on both sides

### Phase 5: Payments & Completion
1. Integrate payment provider
2. Create `process-payment` cloud function
3. Implement checkout flow connected to backend
4. Create `submit-review` cloud function
5. Build review system
6. Create `send-notification` cloud function

### Phase 6: Polish
1. Build notifications center
2. Add push notifications
3. Build admin dashboard
4. Add analytics and monitoring
5. Performance optimization
6. Error handling and edge cases
