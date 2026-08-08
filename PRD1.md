# PickLT — Mover Mobile App PRD
## Complete Product Requirements Document for the React Native Mover Application

> **Purpose**: This document is the single source of truth for building the PickLT Mover mobile app (React Native / Expo) that connects to the exact same Appwrite backend used by the existing Next.js web application. Every API endpoint, business rule, data shape, status machine, and integration detail is documented here so the mobile app is 100% compatible with the live system.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Backend Infrastructure](#2-backend-infrastructure)
3. [Environment Variables](#3-environment-variables)
4. [Authentication System](#4-authentication-system)
5. [Session Management](#5-session-management)
6. [Database Schema](#6-database-schema)
7. [Move Status Machine](#7-move-status-machine)
8. [Mover Profile & Verification](#8-mover-profile--verification)
9. [Navigation & Access Control](#9-navigation--access-control)
10. [Dashboard Screen](#10-dashboard-screen)
11. [Available Moves Screen](#11-available-moves-screen)
12. [Job Details Screen](#12-job-details-screen)
13. [Active Move Screen](#13-active-move-screen)
14. [Scheduled Moves Screen](#14-scheduled-moves-screen)
15. [Earnings Screen](#15-earnings-screen)
16. [Crew Management Screen](#16-crew-management-screen)
17. [Settings Screen](#17-settings-screen)
18. [Move Request Popup](#18-move-request-popup)
19. [GPS Location Broadcasting](#19-gps-location-broadcasting)
20. [Complete API Reference](#20-complete-api-reference)
21. [Realtime Subscriptions](#21-realtime-subscriptions)
22. [Cloud Functions](#22-cloud-functions)
23. [Mobile Integration Notes](#23-mobile-integration-notes)

---

## 1. Project Overview

**App Name**: PickLT Mover  
**Platform**: React Native (Expo)  
**Backend**: Appwrite Cloud — Frankfurt region  
**Endpoint**: `https://fra.cloud.appwrite.io/v1`  
**Project ID**: `698fcc80001f0b5149d8`

### What the Mover App Does

PickLT is a moving service marketplace. The mover app is the supply side — it lets verified moving professionals:

1. Register and submit their profile and vehicle for admin verification
2. Browse nearby customer move requests on a map and list view
3. Accept scheduled moves in advance
4. Receive real-time push notifications for instant move requests
5. Execute the full move lifecycle through 8 tracked phases
6. Broadcast their GPS location to clients in real-time during active moves
7. Confirm cash payment to complete a move
8. Track earnings by period
9. Manage their crew members
10. Update vehicle and personal details in settings

### Key Constraints
- A mover must have `verificationStatus === 'verified'` to perform any move-related action
- Client accounts (`userType === 'client'`) are **blocked** from the mover dashboard
- Movers cannot be clients — accounts are separated at the account type level

---

## 2. Backend Infrastructure

| Service | Detail |
|---|---|
| **Auth** | Appwrite Authentication (Email/Password + Google OAuth + mandatory phone OTP) |
| **Database** | Appwrite Database — 11 collections |
| **Storage** | Appwrite Storage — 2 buckets |
| **Realtime** | Appwrite Realtime WebSocket subscriptions |
| **Cloud Functions** | 12 Appwrite Cloud Functions (Node.js 18 runtime) |
| **Maps** | Mapbox GL JS + Mapbox Directions API |
| **GPS** | Device `navigator.geolocation.watchPosition` / React Native Location |

### Appwrite Collections (from `src/lib/constants.ts`)

All IDs are read from environment variables. The logical names are:
- `USERS` — user account documents
- `MOVER_PROFILES` — mover-specific profile data
- `CREW_MEMBERS` — the mover's team members
- `MOVES` — the central move document (booking)
- `MOVE_REQUESTS` — instant move broadcast records
- `MOVER_LOCATIONS` — GPS location history during active moves
- `MOVE_STATUS_HISTORY` — audit log of status changes
- `PAYMENTS` — payment records
- `REVIEWS` — post-move client reviews
- `NOTIFICATIONS` — in-app notification documents
- `INVENTORY_CATALOG` — item catalog with classification weights

### Appwrite Storage Buckets
- `PROFILE_PHOTOS` (`NEXT_PUBLIC_BUCKET_PROFILE_PHOTOS`) — selfies, driver's license photos
- `MOVE_PHOTOS` (`NEXT_PUBLIC_BUCKET_MOVE_PHOTOS`) — client move photos

---

## 3. Environment Variables

```env
# Appwrite — public (use in React Native app directly)
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=698fcc80001f0b5149d8
EXPO_PUBLIC_APPWRITE_DATABASE_ID=<database-id>
EXPO_PUBLIC_COLLECTION_USERS=<collection-id>
EXPO_PUBLIC_COLLECTION_MOVER_PROFILES=<collection-id>
EXPO_PUBLIC_COLLECTION_CREW_MEMBERS=<collection-id>
EXPO_PUBLIC_COLLECTION_MOVES=<collection-id>
EXPO_PUBLIC_COLLECTION_MOVE_REQUESTS=<collection-id>
EXPO_PUBLIC_COLLECTION_MOVER_LOCATIONS=<collection-id>
EXPO_PUBLIC_COLLECTION_MOVE_STATUS_HISTORY=<collection-id>
EXPO_PUBLIC_COLLECTION_PAYMENTS=<collection-id>
EXPO_PUBLIC_COLLECTION_REVIEWS=<collection-id>
EXPO_PUBLIC_COLLECTION_NOTIFICATIONS=<collection-id>
EXPO_PUBLIC_COLLECTION_INVENTORY_CATALOG=<collection-id>
EXPO_PUBLIC_BUCKET_PROFILE_PHOTOS=<bucket-id>
EXPO_PUBLIC_BUCKET_MOVE_PHOTOS=<bucket-id>

# Mapbox
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=<mapbox-token>

# API base URL — the Next.js web app's API
EXPO_PUBLIC_API_BASE_URL=https://your-picklt-web-app.com
```

> **Important**: The existing Next.js web app exposes all the mover-specific API routes at `/api/mover/*`. The mobile app should call these same endpoints. For authentication, the mobile app uses Appwrite native sessions (not the web cookie system — see section 5).

---

## 4. Authentication System

### 4.1 Supported Auth Methods
1. **Email + Password** — `account.createEmailPasswordSession(email, password)`
2. **Google OAuth** — `account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl)`
3. **Mandatory Phone OTP** — required after any first-time login (phone must be verified before accessing the mover dashboard)

### 4.2 Mover Login Flow (Exact Steps)

```
Step 1: Choose auth method
  ├── Email/Password → createEmailPasswordSession()
  └── Google OAuth → createOAuth2Session() → callback URL handling

Step 2: After auth succeeds → check phoneVerification
  ├── phoneVerified = true → proceed to Step 4
  └── phoneVerified = false → mandatory phone OTP step (Step 3)

Step 3: Phone Verification (Mandatory)
  3a. Collect phone number with country code (e.g. +49123456789)
  3b. POST /api/auth/set-phone { phone } → sets phone on Appwrite auth account
  3c. account.createPhoneVerification() → sends SMS OTP via Twilio
  3d. User enters 6-digit OTP code
  3e. account.updatePhoneVerification(userId, secret) → marks phone as verified
  3f. Re-sync user profile

Step 4: Sync user profile
  → POST /api/auth/sync-user
  → Returns { user: UserDoc, moverProfile: MoverProfileDoc | null, crewMembers: CrewMemberDoc[] }

Step 5: Route to appropriate screen
  ├── No mover profile → Complete Profile wizard (/complete-profile)
  ├── Has profile, verificationStatus = 'pending_verification' → Dashboard (limited)
  └── Has profile, verificationStatus = 'verified' → Full Dashboard
```

### 4.3 User Type Enforcement

- On sync-user, if `userType === 'client'` → **block entry** to mover app with error: "Your account is registered as a client. Please create a new account to register as a mover."
- `userType` is stored in the `users` collection, NOT on the Appwrite auth account
- The mobile app should check `userDoc.userType` from the sync response to enforce this

### 4.4 Verification Status Access Table

| `verificationStatus` | Can View Dashboard | Can Accept Moves | Can Update Status | Can View Restricted Screens |
|---|---|---|---|---|
| `pending_verification` | ✅ | ❌ | ❌ | ❌ |
| `verified` | ✅ | ✅ | ✅ | ✅ |
| `suspended` | ✅ (read-only) | ❌ | ❌ | ❌ |
| `rejected` | ✅ (read-only) | ❌ | ❌ | ❌ |

### 4.5 User Object Shape (Post-Auth)

```typescript
interface User {
  authId: string           // Appwrite Auth user $id
  appwriteId: string       // users collection document $id
  fullName: string
  email: string
  phone: string
  profilePhoto?: string    // Storage file ID or full URL
  userType: 'client' | 'mover'
  emailVerified: boolean
  phoneVerified: boolean
  moverDetails?: {
    profileId: string            // mover_profiles collection $id
    driversLicense?: string
    driversLicensePhoto?: string
    socialSecurityNumber?: string
    taxNumber?: string
    primaryCity?: string
    primaryCountry?: string
    vehicleBrand?: string
    vehicleModel?: string
    vehicleYear?: string
    vehicleCapacity?: string     // kg as string
    vehicleRegistration?: string // plate number
    vehicleType?: 'small_van' | 'medium_truck' | 'large_truck'
    rating?: number              // 0–5 float
    totalMoves?: number
    yearsExperience?: number
    verificationStatus?: 'pending_verification' | 'verified' | 'suspended' | 'rejected'
    isOnline?: boolean
    baseRate?: number            // EUR per km
    languages?: string[]
  }
}
```

---

## 5. Session Management

### 5.1 How the Web App Does It (For Context)

The web app uses a **dual session** system:
1. Appwrite Web SDK stores its session cookie on the Appwrite domain (inaccessible to Next.js API routes)
2. After auth, the app calls `POST /api/auth/init-session` which creates a **signed HMAC-SHA256 `picklt_session` cookie** on the app's domain
3. All API routes use `getSessionUserId()` which reads and verifies this cookie
4. Cookie format: `userId:timestamp:hmac_signature`
5. Cookie name: `picklt_session`
6. Max age: 30 days

### 5.2 Mobile App Session Strategy

The mobile app uses **Appwrite native sessions** via the Appwrite React Native SDK. However, the existing Next.js API routes (`/api/mover/*`) authenticate via the `picklt_session` cookie.

**Two options to bridge this gap:**

#### Option A — Use Appwrite SDK directly (Recommended for pure mobile flows)
For all operations that can be done via Appwrite SDK directly (reading/writing documents with proper permissions), skip the Next.js API routes and use the Appwrite SDK.

```typescript
import { Client, Account, Databases, Query } from 'react-native-appwrite'

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('698fcc80001f0b5149d8')
  .setPlatform('io.picklt.mover') // your app bundle ID

const account = new Account(client)
const databases = new Databases(client)
```

#### Option B — Proxy through the Next.js API (For complex business logic)
For operations with complex business logic (status transitions, nearby move discovery, earnings aggregation), call the Next.js API routes by passing the session token as a custom header or by using server-side API keys.

**Recommended hybrid approach:**
- Use Appwrite SDK **directly** for: real-time subscriptions, GPS location writes, simple document reads
- Call **Next.js API routes** for: complex queries (dashboard, available moves, earnings), status machine transitions, payment confirmation
- To authenticate against Next.js API routes from mobile: send a Bearer token or add a custom `X-User-Id` header verified against Appwrite (requires adding a new auth mechanism to the API routes, OR passing the Appwrite session token as a cookie header)

---

## 6. Database Schema

### 6.1 `users` Collection

| Field | Type | Notes |
|---|---|---|
| `$id` | string | Appwrite document ID — same as Auth user ID |
| `email` | string | Unique |
| `fullName` | string | |
| `phone` | string | With country code |
| `profilePhoto` | string | Storage file ID |
| `userType` | enum | `'client'` \| `'mover'` |
| `emailVerified` | boolean | |
| `phoneVerified` | boolean | |
| `createdAt` | datetime | |

### 6.2 `mover_profiles` Collection

| Field | Type | Notes |
|---|---|---|
| `$id` | string | |
| `userId` | string / relationship | → `users.$id` |
| `driversLicense` | string | License number |
| `driversLicensePhoto` | string \| null | Storage file ID |
| `selfiePhoto` | string \| null | Storage file ID (set as profile photo) |
| `socialSecurityNumber` | string \| null | |
| `taxNumber` | string \| null | |
| `primaryCity` | string \| null | |
| `primaryCountry` | string \| null | |
| `vehicleBrand` | string \| null | |
| `vehicleModel` | string \| null | |
| `vehicleYear` | string \| null | |
| `vehicleCapacity` | string \| null | kg |
| `vehicleRegistration` | string \| null | Plate number |
| `vehicleType` | enum \| null | `'small_van'` \| `'medium_truck'` \| `'large_truck'` |
| `rating` | float | Default 0, computed 0–5 |
| `totalMoves` | integer | Incremented on each completion |
| `yearsExperience` | integer | |
| `baseRate` | float | EUR per km |
| `languages` | string[] | |
| `verificationStatus` | enum | `'pending_verification'` \| `'verified'` \| `'suspended'` \| `'rejected'` |
| `isOnline` | boolean | Set true when GPS is broadcast, indicates availability |
| `currentLatitude` | float \| null | Updated on each GPS broadcast |
| `currentLongitude` | float \| null | Updated on each GPS broadcast |

### 6.3 `crew_members` Collection

| Field | Type | Notes |
|---|---|---|
| `$id` | string | |
| `moverProfileId` | string / relationship | → `mover_profiles.$id` |
| `name` | string | |
| `phone` | string | |
| `photo` | string \| null | Storage file ID |
| `role` | enum | `'driver'` \| `'helper'` |
| `isActive` | boolean | |

### 6.4 `moves` Collection (Mover-relevant fields)

| Field | Type | Notes |
|---|---|---|
| `$id` | string | Primary key |
| `handle` | string | Unique readable ID e.g. `MV-2026-001234` |
| `clientId` | string / relationship | → `users.$id` (the client) |
| `moverProfileId` | string \| null / relationship | → `mover_profiles.$id` |
| `status` | enum | See Section 7 |
| `moveCategory` | enum | `'instant'` \| `'scheduled'` |
| `moveType` | enum | `'light'` \| `'regular'` \| `'premium'` |
| `systemMoveType` | enum | Server-computed move type |
| `moveDate` | datetime \| null | For scheduled moves |
| `arrivalWindow` | string \| null | e.g. `"09:00"` |
| `pickupLocation` | string | Full address label |
| `pickupStreetAddress` | string | |
| `pickupLatitude` | float | |
| `pickupLongitude` | float | |
| `pickupFloorLevel` | string \| null | |
| `pickupElevator` | boolean | |
| `pickupParking` | string \| null | |
| `pickupHaltverbot` | boolean | |
| `pickupApartmentUnit` | string \| null | |
| `dropoffLocation` | string | Full address label |
| `dropoffStreetAddress` | string | |
| `dropoffLatitude` | float | |
| `dropoffLongitude` | float | |
| `dropoffFloorLevel` | string \| null | |
| `dropoffElevator` | boolean | |
| `dropoffParking` | string \| null | |
| `dropoffHaltverbot` | boolean | |
| `dropoffApartmentUnit` | string \| null | |
| `homeType` | enum | `'apartment'` \| `'house'` \| `'office'` \| `'storage'` |
| `inventoryItems` | string (JSON) | `Record<itemId, quantity>` |
| `customItems` | string (JSON) | Array of custom items |
| `totalItemCount` | integer | |
| `totalWeightKg` | float | |
| `totalVolumeCm3` | float | |
| `packingServiceLevel` | enum | `'none'` \| `'partial'` \| `'full'` \| `'unpacking'` |
| `additionalServices` | string[] | Array of service IDs |
| `crewSize` | string | `'1'` \| `'2'` \| `'3'` \| `'4plus'` |
| `vehicleType` | string \| null | |
| `coverPhotoId` | string \| null | Storage file ID |
| `galleryPhotoIds` | string[] | Storage file IDs |
| `contactFullName` | string \| null | |
| `contactPhone` | string \| null | |
| `contactEmail` | string \| null | |
| `contactNotes` | string \| null | |
| `estimatedPrice` | float \| null | System-calculated EUR |
| `finalPrice` | float \| null | Set at completion |
| `routeDistanceMeters` | float \| null | Mapbox route distance |
| `routeDurationSeconds` | float \| null | Mapbox route duration |
| `termsAccepted` | boolean | |
| `paidAt` | datetime \| null | |
| `completedAt` | datetime \| null | |
| `$createdAt` | datetime | |
| `$updatedAt` | datetime | |

### 6.5 `move_requests` Collection

| Field | Type | Notes |
|---|---|---|
| `$id` | string | |
| `moveId` | string / relationship | → `moves.$id` |
| `moverProfileId` | string / relationship | → `mover_profiles.$id` |
| `status` | enum | `'pending'` \| `'accepted'` \| `'declined'` \| `'expired'` |
| `sentAt` | datetime | |
| `respondedAt` | datetime \| null | |
| `expiresAt` | datetime | Auto-expire after 60 seconds for instant moves |

### 6.6 `mover_locations` Collection

| Field | Type | Notes |
|---|---|---|
| `$id` | string | |
| `moverProfileId` | string / relationship | → `mover_profiles.$id` |
| `moveId` | string \| null | → `moves.$id` (associated move) |
| `latitude` | float | |
| `longitude` | float | |
| `heading` | float \| null | Compass degrees |
| `speed` | float \| null | km/h |
| `timestamp` | datetime | |

### 6.7 `payments` Collection

| Field | Type | Notes |
|---|---|---|
| `$id` | string | |
| `moveId` | string / relationship | → `moves.$id` |
| `clientId` | string \| null | → `users.$id` |
| `amount` | float | EUR |
| `currency` | string | Default `'EUR'` |
| `status` | enum | `'pending'` \| `'completed'` \| `'refunded'` \| `'failed'` |
| `paymentMethod` | string | `'cash'` \| `'card'` \| `'paypal'` \| `'bank_transfer'` |
| `moverConfirmedAt` | datetime \| null | When mover confirms receipt |
| `clientConfirmedAt` | datetime \| null | When client confirms payment |
| `transactionId` | string \| null | External payment reference |

### 6.8 `notifications` Collection

| Field | Type | Notes |
|---|---|---|
| `$id` | string | |
| `userId` | string | → `users.$id` |
| `type` | enum | `'move_request'` \| `'move_accepted'` \| `'mover_arrived'` \| `'move_completed'` \| `'payment'` \| `'review'` \| `'system'` |
| `title` | string | |
| `body` | string | |
| `data` | string (JSON) | Extra payload e.g. `{ moveId: "..." }` |
| `isRead` | boolean | |
| `createdAt` | datetime | |

---

## 7. Move Status Machine

### 7.1 Complete Status List

| Status | Description | Who Sets It |
|---|---|---|
| `draft` | Move created, not yet submitted | Backend |
| `booked` | Move submitted and saved (no mover yet) | Backend |
| `pending_payment` | Awaiting client payment | Backend |
| `paid` | Client paid, awaiting mover assignment | Backend |
| `mover_assigned` | A specific mover has been selected (instant flow) | Backend (broadcast) |
| `mover_accepted` | Mover accepted the job | Mover |
| `mover_en_route` | Mover driving to pickup | Mover |
| `mover_arrived` | Mover at pickup location | Mover |
| `loading` | Loading items onto vehicle | Mover |
| `in_transit` | Driving to dropoff | Mover |
| `arrived_destination` | Mover at dropoff | Mover |
| `unloading` | Unloading items at destination | Mover |
| `awaiting_payment` | Move complete, awaiting payment confirmation | Mover |
| `completed` | Both sides confirmed payment, move done | System (both confirm) |
| `cancelled_by_client` | Client cancelled | System |
| `cancelled_by_mover` | Mover cancelled | System |
| `disputed` | Under dispute | Admin |

### 7.2 Valid Status Transitions (MOVER → API)

The API route `POST /api/mover/update-move-status` enforces these transitions:

```
mover_accepted  ─────────────────┐
mover_assigned  ─────────────────┤──► mover_en_route
accepted        ─────────────────┘

mover_en_route  ──────────────────► mover_arrived

mover_arrived   ──────────────────► loading

loading         ──────────────────► in_transit

in_transit      ──────────────────► arrived_destination

arrived_destination ──────────────► unloading

unloading       ──────────────────► awaiting_payment
  └── SIDE EFFECT: creates payment record { status: 'pending', paymentMethod: 'cash' }

awaiting_payment ─────────────────► completed
  └── Via POST /api/mover/confirm-payment (requires BOTH mover + client confirmation)
```

### 7.3 Mover Phase ↔ API Status Mapping

The UI uses 8 phase names that map to API status strings:

| UI Phase Name | API Status Written | UI Label | UI Description |
|---|---|---|---|
| `en_route` | `mover_en_route` | "En Route to Pickup" | "Head to the pickup location" |
| `arrived_pickup` | `mover_arrived` | "At Pickup" | "You have arrived. Start loading items." |
| `loading` | `loading` | "Loading" | "Loading items onto your vehicle" |
| `in_transit` | `in_transit` | "In Transit" | "Driving to the drop-off location" |
| `arrived_dropoff` | `arrived_destination` | "At Drop-off" | "You have arrived at the destination" |
| `unloading` | `unloading` | "Unloading" | "Unloading items at the destination" |
| `awaiting_payment` | `awaiting_payment` | "Awaiting Payment" | "Waiting for payment confirmation" |
| `completed` | `completed` | "Completed" | "Move completed successfully!" |

### 7.4 Deriving UI Phase from DB Status

```typescript
function statusToPhase(dbStatus: string): MovePhase {
  const map: Record<string, MovePhase> = {
    mover_en_route: 'en_route',
    mover_arrived: 'arrived_pickup',
    loading: 'loading',
    in_transit: 'in_transit',
    arrived_destination: 'arrived_dropoff',
    unloading: 'unloading',
    awaiting_payment: 'awaiting_payment',
    completed: 'completed',
  }
  return map[dbStatus] || 'en_route'
}

function phaseToNextStatus(phase: MovePhase): string {
  const map: Record<MovePhase, string> = {
    en_route: 'mover_arrived',
    arrived_pickup: 'loading',
    loading: 'in_transit',
    in_transit: 'arrived_destination',
    arrived_dropoff: 'unloading',
    unloading: 'awaiting_payment',
    awaiting_payment: 'completed', // via confirm-payment, not update-move-status
    completed: 'completed',
  }
  return map[phase]
}
```

---

## 8. Mover Profile & Verification

### 8.1 Complete Profile Wizard (5 Steps)

After first login, if no mover profile exists, the mover is redirected to complete their profile. The wizard has 5 steps:

#### Step 1 — Personal Info
| Field | Required | Notes |
|---|---|---|
| `fullName` | ✅ | Also updates Appwrite Auth name |
| `phone` | ✅ | With country code (e.g. `+49123456789`) |
| `driversLicense` | ✅ | License number (string) |
| `driversLicensePhoto` | ❌ | `POST /api/user/upload-photo` → returns file ID |

#### Step 2 — Verification
| Field | Required | Notes |
|---|---|---|
| `selfiePhoto` | ✅ | REQUIRED — uploaded first, used as profile photo |
| `socialSecurityNumber` | ✅ | |
| `taxNumber` | ✅ | |
| `primaryCity` | ✅ | |
| `primaryCountry` | ✅ | One of 20 supported countries (see list below) |

**Supported countries for primary country:**
Germany, Austria, Switzerland, Netherlands, Belgium, France, Poland, Czech Republic, Slovakia, Hungary, Romania, Bulgaria, Greece, Italy, Spain, Portugal, Sweden, Denmark, Norway, United Kingdom

#### Step 3 — Vehicle Info
| Field | Required | Notes |
|---|---|---|
| `vehicleBrand` | ✅ | |
| `vehicleModel` | ✅ | |
| `vehicleYear` | ✅ | |
| `vehicleCapacity` | ✅ | kg capacity |
| `vehicleRegistration` | ✅ | Plate number |
| `vehicleType` | ✅ | `'small_van'` \| `'medium_truck'` \| `'large_truck'` |

**Vehicle type definitions:**
- `small_van` — Up to 10 m³ — small moves, single items
- `medium_truck` — 10–25 m³ — apartment moves
- `large_truck` — 25+ m³ — house moves, large loads

#### Step 4 — Experience
| Field | Required | Notes |
|---|---|---|
| `yearsExperience` | ✅ | Integer |
| `baseRate` | ✅ | EUR per km charged to clients |
| `languages` | ✅ | Multi-select (at least 1) |

**Supported languages:** English, German, French, Spanish, Turkish, Arabic, Polish, Romanian, Italian, Portuguese

#### Step 5 — Review & Submit
Shows a summary of all entered data. On submit:
- `POST /api/mover/submit-profile` (see Section 20)
- After success: `userType` is set to `'mover'`, `verificationStatus = 'pending_verification'`
- User is redirected to dashboard

### 8.2 Verification Status UX

After profile submission, the mover waits for admin review. The dashboard shows a banner based on status:

| Status | Banner / Message |
|---|---|
| `pending_verification` | "Your profile is under review. We'll notify you once verified." |
| `verified` | Full access — no banner |
| `rejected` | "Your application was rejected. Please contact support." |
| `suspended` | "Your account has been suspended. Contact support." |

### 8.3 Photo Upload Flow

Photos are uploaded via `POST /api/user/upload-photo` with multipart FormData:

```typescript
const formData = new FormData()
formData.append('file', {
  uri: localImageUri,
  type: 'image/jpeg',
  name: 'photo.jpg',
})
formData.append('bucket', 'profile-photos') // or 'move-photos'

const response = await fetch(`${API_BASE_URL}/api/user/upload-photo`, {
  method: 'POST',
  body: formData,
  headers: {
    Cookie: `picklt_session=${sessionToken}`,
    // OR use your mobile auth mechanism
  },
})
const { fileId } = await response.json()
```

**Photo URL construction** (for displaying stored photos):
```
${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${FILE_ID}/view?project=${PROJECT_ID}
```

---

## 9. Navigation & Access Control

### 9.1 Mover Navigation Items

| Screen | Route | Requires Verification | Requires Profile |
|---|---|---|---|
| Dashboard | `/dashboard` | ❌ | ✅ |
| Active Move | `/active-move` | ✅ | ✅ |
| Available Moves | `/available-moves` | ✅ | ✅ |
| Scheduled Moves | `/scheduled-moves` | ✅ | ✅ |
| My Crew | `/my-crew` | ✅ | ✅ |
| Earnings | `/earnings` | ✅ | ✅ |
| Settings | `/settings` | ❌ | ✅ |
| Complete Profile | `/complete-profile` | ❌ | ❌ |

### 9.2 Layout Guard Logic

The web app's layout enforces these redirects (replicate in React Native navigation):

```typescript
// 1. If auth is loading → show loading spinner
if (isLoading) return <LoadingScreen />

// 2. If not authenticated → redirect to login
if (!user) navigate('Login')

// 3. If client account trying to access mover app → redirect to login
if (user.userType === 'client') navigate('Login')

// 4. If no mover profile → redirect to Complete Profile
const hasProfile = !!user?.moverDetails?.profileId
if (!hasProfile) navigate('CompleteProfile')

// 5. If unverified + trying to access restricted screen → redirect to Dashboard
const isVerified = user?.moverDetails?.verificationStatus === 'verified'
const restrictedScreens = ['ActiveMove', 'AvailableMoves', 'ScheduledMoves', 'MyCrew', 'Earnings', 'JobDetails']
if (!isVerified && restrictedScreens.includes(currentScreen)) navigate('Dashboard')
```

### 9.3 GPS Broadcasting in Layout

The layout continuously broadcasts the mover's GPS location when verified and active. This is done globally (not per-screen). Replicate this with a background task or foreground service in React Native:

```typescript
// Start location broadcasting when:
// - user is authenticated
// - userType === 'mover'
// - verificationStatus === 'verified'
// Default interval: 30 seconds (throttled in the hook)
// During active moves: every 3 seconds

useLocationBroadcast({ enabled: isVerifiedMover })
```

---

## 10. Dashboard Screen

### 10.1 Data Source

`GET /api/mover/dashboard`

**Response shape:**
```typescript
{
  moverProfile: MoverProfileDoc,
  activeMoves: MoveDoc[],
  activeMovesCount: number,      // moves in: mover_en_route, mover_arrived, loading, in_transit, arrived_destination, unloading
  scheduledMovesCount: number,   // moves in: mover_accepted (scheduled category)
  completedThisMonth: number,
  pendingRequests: MoveRequestDoc[],
  crewMembers: CrewMemberDoc[],
  earningsThisMonth: number,     // EUR, from payments collection (completed payments this month)
  recentMoves: RecentMove[]      // last N completed/active moves
}
```

**RecentMove shape:**
```typescript
{
  $id: string
  pickupLabel: string         // e.g. "Berlin, Germany"
  pickupAddress: string       // street address
  dropoffLabel: string
  dropoffAddress: string
  scheduledDate: string       // ISO date
  status: string              // DB status string
  estimatedPrice: number      // EUR
  moveCategory: string        // 'instant' | 'scheduled'
  totalItems: number
  routeDistanceMeters: number | null
}
```

### 10.2 Stats Cards

Display these 6 stats:

| Stat | Field | Icon |
|---|---|---|
| Available Moves | Count of nearby available moves (separate API call) | Map icon |
| Active Moves | `activeMovesCount` | Truck icon |
| Scheduled Moves | `scheduledMovesCount` | Calendar icon |
| Completed This Month | `completedThisMonth` | Checkmark icon |
| Crew Members | `crewMembers.length` | Group icon |
| Earnings This Month | `earningsThisMonth` formatted as `€X,XXX` | Banknotes icon |

### 10.3 Quick Actions

| Action | Navigates To | Disabled When |
|---|---|---|
| "Find Moves" | Available Moves screen | `verificationStatus !== 'verified'` |
| "Manage Crew" | My Crew screen | `verificationStatus !== 'verified'` |

Show disabled state with lock icon and tooltip: "Your profile needs to be verified first"

### 10.4 Recent Moves List

Show the last 5–10 moves from `recentMoves`. Each card shows:
- Pickup → Dropoff (abbreviated labels)
- Date formatted: "Mon, Jan 12 · 09:00"
- Status badge (color-coded)
- Amount: `€X.XX`
- Item count: `X items`
- Distance: `X.X km`

Tap → navigate to Job Details screen

---

## 11. Available Moves Screen

### 11.1 Purpose

Discover scheduled moves near the mover's current location. Only moves with `status = 'draft'` or `'booked'` and `moveCategory = 'scheduled'` are shown.

### 11.2 Data Source

`GET /api/mover/nearby-moves?lat={lat}&lng={lng}`

- If no coordinates passed: falls back to mover profile's `currentLatitude`/`currentLongitude`
- Polling: every 30 seconds
- Radius: 30 km (Haversine distance calculation)

**Filters applied server-side:**
1. `moveCategory === 'scheduled'`
2. `status IN ['draft', 'booked']`
3. Distance from mover ≤ 30 km
4. `moveDate` is today or future (excludes past moves)
5. Excludes moves where `clientId === currentMoverUserId`
6. Excludes moves with null coordinates

**Response:**
```typescript
{
  moves: NearbyMove[]
}
```

### 11.3 NearbyMove Interface

```typescript
interface NearbyMove {
  id: string
  handle: string | null
  moveType: string | null           // 'light' | 'regular' | 'premium'
  moveCategory: string | null       // 'scheduled' (always for this endpoint)
  status: string                    // 'draft' | 'booked'
  pickupLocation: string | null     // Full address label
  pickupStreetAddress: string | null
  pickupLatitude: number | null
  pickupLongitude: number | null
  pickupFloorLevel: string | null
  pickupElevator: boolean | null
  dropoffLocation: string | null
  dropoffStreetAddress: string | null
  dropoffLatitude: number | null
  dropoffLongitude: number | null
  dropoffFloorLevel: string | null
  dropoffElevator: boolean | null
  homeType: string | null           // 'apartment' | 'house' | 'office' | 'storage'
  totalItemCount: number | null
  estimatedPrice: number | null     // EUR
  additionalServices: string[]
  crewSize: string | null           // '1' | '2' | '3' | '4plus'
  vehicleType: string | null
  moveDate: string | null           // ISO datetime
  arrivalWindow: string | null      // e.g. "09:00"
  routeDistanceMeters: number | null
  routeDurationSeconds: number | null
  coverPhotoId: string | null       // Storage file ID
  galleryPhotoIds: string[]
  packingServiceLevel: string | null
  paymentMethod: string | null
  createdAt: string                 // ISO datetime
  distanceFromMover: number         // km (added by the API, not in DB)
}
```

### 11.4 View Modes

**Map View** (primary):
- Full-screen map (Mapbox or Apple Maps / Google Maps in React Native)
- Price markers on each available move: `€X` bubble
- Tap a marker → show floating bottom card with move summary
- Card has "View Details" button → navigate to Job Details

**List View** (toggle):
- Scrollable list of move cards
- Each card shows: pickup/dropoff labels, distance from mover, date/time, estimated price, item count, home type
- Tap → navigate to Job Details

### 11.5 GPS Strategy for Available Moves

```typescript
// Priority 1: Device GPS (real-time)
const position = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced,
})
setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })

// Priority 2: Profile coordinates (fallback if GPS unavailable)
const { lat, lng } = moverProfile.currentLatitude, moverProfile.currentLongitude
```

### 11.6 Empty State

"No scheduled moves within 30 km right now. We check automatically every 30 seconds."

---

## 12. Job Details Screen

### 12.1 Navigation

Accessed via: `Available Moves → tap move` or `Scheduled Moves → tap move` or `Dashboard → tap recent move`

URL pattern: `/job-details/{handle}` (web) → `JobDetails` screen with `handle` param (mobile)

### 12.2 Data Source

`GET /api/moves/by-handle/{handle}`

> **Note**: This is a general API route (not under `/api/mover/`). It returns the full move document. The mobile app needs to implement this endpoint call or use the Appwrite SDK directly to fetch by handle.

Alternative direct Appwrite SDK approach:
```typescript
const moves = await databases.listDocuments(DATABASE_ID, MOVES_COLLECTION, [
  Query.equal('handle', [handle]),
  Query.limit(1),
])
const move = moves.documents[0]
```

### 12.3 MoveData Interface

```typescript
interface MoveData {
  id: string                      // $id
  handle: string | null
  status: string                  // raw DB status
  moveType: string                // 'light' | 'regular' | 'premium'
  moveCategory: string            // 'instant' | 'scheduled'
  pickupLocation: string
  pickupStreetAddress: string
  pickupLatitude: number | null
  pickupLongitude: number | null
  pickupFloorLevel: string
  pickupElevator: boolean
  pickupParking: string
  pickupHaltverbot: boolean
  dropoffLocation: string
  dropoffStreetAddress: string
  dropoffLatitude: number | null
  dropoffLongitude: number | null
  dropoffFloorLevel: string
  dropoffElevator: boolean
  dropoffParking: string
  dropoffHaltverbot: boolean
  homeType: string
  inventoryItems: Record<string, number>  // itemId → quantity
  customItems: unknown[]
  totalItemCount: number
  totalWeightKg: number
  packingServiceLevel: string             // 'none' | 'partial' | 'full' | 'unpacking'
  additionalServices: string[]
  crewSize: string                        // '1' | '2' | '3' | '4plus'
  vehicleType: string
  moveDate: string | null                 // ISO datetime
  arrivalWindow: string | null
  estimatedPrice: number
  finalPrice: number | null
  routeDistanceMeters: number | null
  routeDurationSeconds: number | null
  coverPhotoId: string | null
  galleryPhotoIds: string[]
  contactFullName: string | null
  contactPhone: string | null
  contactNotes: string | null
  moverProfileId: string | null           // assigned mover's profile $id
  clientId: string | null                 // client user $id
  moveDocId: string                       // Appwrite document $id (same as id)
  createdAt: string
  updatedAt: string
}
```

### 12.4 Derived State

From a move document, compute these boolean helpers for UI logic:

```typescript
const isScheduled = move.moveCategory === 'scheduled'
const isInstant = move.moveCategory === 'instant'
const isAssignedMover = move.moverProfileId === currentMoverProfile.$id
const moverProfileId = move.moverProfileId  // null if unassigned
const rawStatus = move.status

// Can the current mover accept this move?
const canAccept = isScheduled && !moverProfileId && ['draft', 'booked', 'paid', 'pending_payment'].includes(rawStatus)

// Can the current mover withdraw from this move?
const canWithdraw = isAssignedMover && ['mover_accepted', 'mover_assigned'].includes(rawStatus)

// Can the mover start the route?
const isMoveDate = new Date(move.moveDate).toDateString() === new Date().toDateString()
const canStartRoute = isAssignedMover && rawStatus === 'mover_accepted' && isMoveDate

// Is move currently in the active execution phase?
const ACTIVE_STATUSES = ['mover_en_route', 'mover_arrived', 'loading', 'in_transit', 'arrived_destination', 'unloading', 'awaiting_payment']
const isActiveMove = isAssignedMover && ACTIVE_STATUSES.includes(rawStatus)
```

### 12.5 Action Buttons

| Button | Condition | API Call |
|---|---|---|
| "Accept Move" | `canAccept` | `POST /api/mover/accept-scheduled-move { moveId }` |
| "Withdraw" | `canWithdraw` | `POST /api/mover/withdraw-scheduled-move { moveId }` |
| "Start Route" | `canStartRoute` | `POST /api/mover/update-move-status { moveId, status: 'mover_en_route' }` |
| "Go to Active Move" | `isActiveMove` | Navigate to Active Move screen |

**Withdraw requires confirmation dialog:**
> "Are you sure you want to withdraw from this move? The move will be made available to other movers."

**Start Route date guard:**
If `isMoveDate === false` (future date), show:
> "Move not startable yet. You can start this route on [formatted date]."

### 12.6 Real-time Updates

Subscribe to the specific move document to catch cancellations and status changes:

```typescript
const channel = `databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents.${move.moveDocId}`
client.subscribe(channel, (response) => {
  const updatedMove = response.payload
  // Re-fetch or update local state
  // If status === 'cancelled_by_client' → show alert, offer to dismiss
})
```

### 12.7 Move Info Displayed

On the job details screen, show all of:
- Cover photo + gallery (if any)
- Pickup and dropoff addresses with floor/elevator info
- Move date and arrival window
- Home type (apartment/house/etc.)
- Item count, estimated weight
- Packing level, additional services
- Crew size, vehicle type required
- Distance and estimated duration
- Estimated price
- Payment method

---

## 13. Active Move Screen

### 13.1 Purpose

Full-screen live execution screen during an active move. Shows a Mapbox map with the route and an action panel.

### 13.2 Data Source

`GET /api/mover/active-move`

**Response:**
```typescript
{
  move: MoveDoc | null  // null if no active move
}
```

**Active move definition** (from API logic):
- Primary: any move with `moverProfileId === currentMoverProfile.$id` AND `status IN ['mover_en_route', 'mover_arrived', 'loading', 'in_transit', 'arrived_destination', 'unloading', 'awaiting_payment']`
- Fallback: if above empty → instant move with `status === 'mover_accepted'` (to auto-transition to en_route)

### 13.3 Auto-Transition on Load

If the fetched move has `status === 'mover_accepted'` AND it is the scheduled move date:
→ Auto-call `POST /api/mover/update-move-status { moveId, status: 'mover_en_route' }`
→ This starts the active move flow

### 13.4 The 8-Phase Active Move Flow

```
Phase 1: en_route (driving to pickup)
  - Shows: map with route from mover to pickup location
  - ETA: computed every 15s via Mapbox Directions API
  - GPS: broadcast every 3 seconds
  - Action button: "I've Arrived at Pickup"
  - Guard: must be within 100m of pickup coordinates to advance
    → If > 100m: show toast/alert "You must be within 100m of the pickup location"

Phase 2: arrived_pickup (at pickup)
  - Shows: confirmation that mover has arrived
  - Action button: "Start Loading"
  - No proximity check needed

Phase 3: loading (loading items)
  - Action button: "Start Driving to Dropoff"

Phase 4: in_transit (driving to dropoff)
  - Shows: map with route from current position to dropoff
  - ETA: computed every 15s
  - GPS: broadcast every 3 seconds
  - Action button: "I've Arrived at Dropoff"
  - Guard: must be within 100m of dropoff coordinates to advance
    → Note: The web app only checks proximity for pickup, but apply similar logic for dropoff

Phase 5: arrived_dropoff (at dropoff)
  - Action button: "Start Unloading"

Phase 6: unloading
  - Action button: "Request Payment"
  - SIDE EFFECT: creates payment record in DB

Phase 7: awaiting_payment
  - Action button: "Confirm I Received Payment (Cash)"
  - Poll payment status every 5s: GET /api/moves/payment-status?moveId={moveId}
  - Show: "Waiting for client to confirm payment on their end"
  - If client already confirmed: show "Client has confirmed – waiting for your confirmation"

Phase 8: completed
  - Show success state
  - Navigate to Dashboard after delay
```

### 13.5 Phase Advance Logic

```typescript
async function advancePhase() {
  const currentPhase = statusToPhase(move.status)
  
  // Special case: confirm payment
  if (currentPhase === 'awaiting_payment') {
    await fetch('/api/mover/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({ moveId: move.$id })
    })
    return
  }
  
  const nextStatus = phaseToNextStatus(currentPhase)
  
  // Proximity check for arriving at pickup
  if (currentPhase === 'en_route') {
    const distance = calculateDistance(
      currentGPS.lat, currentGPS.lng,
      move.pickupLatitude, move.pickupLongitude
    )
    if (distance > 0.1) { // 0.1 km = 100m
      showAlert('You must be within 100m of the pickup location')
      return
    }
  }
  
  await fetch('/api/mover/update-move-status', {
    method: 'POST',
    body: JSON.stringify({ moveId: move.$id, status: nextStatus })
  })
}
```

### 13.6 GPS Tracking During Active Move

During an active move, GPS must be broadcast every **3 seconds**:

```typescript
// React Native (Expo Location)
const subscription = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.High,
    timeInterval: 3000,
    distanceInterval: 0,
  },
  async (position) => {
    const { latitude, longitude, heading, speed } = position.coords
    
    // Broadcast to server
    await fetch('/api/mover/update-location', {
      method: 'POST',
      body: JSON.stringify({
        latitude,
        longitude,
        heading,
        speed,
        moveId: move.$id,
      })
    })
    
    // If in en_route or in_transit: refresh ETA every 15s
    if (shouldRefreshETA) {
      const directions = await getMapboxDirections(
        latitude, longitude,
        targetLat, targetLng
      )
      setETA(formatDuration(directions.durationSeconds))
    }
  }
)
```

### 13.7 Distance Calculation (for 100m proximity check)

```typescript
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Haversine formula — returns distance in km
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c  // km
}

// Usage: if distance < 0.1 (100m) → allow advance
```

### 13.8 ETA Calculation

```typescript
// Mapbox Directions API
const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${lng},${lat};${targetLng},${targetLat}?access_token=${MAPBOX_TOKEN}&overview=false`
const res = await fetch(url)
const data = await res.json()
const { distance, duration } = data.routes[0]
// distance in meters, duration in seconds
```

### 13.9 Payment Status Polling

When phase is `awaiting_payment`, poll every 5 seconds:

```typescript
// GET /api/moves/payment-status?moveId={moveId}
// Response: { status: 'pending' | 'completed', clientConfirmedAt: string | null, moverConfirmedAt: string | null }
// If status === 'completed' → move is done, navigate to success
```

### 13.10 Client Cancellation Handling

Subscribe to move document realtime. If `status === 'cancelled_by_client'`:
- Show alert banner: "This move has been cancelled by the client"
- Auto-dismiss after 6 seconds
- Navigate to Dashboard

### 13.11 Realtime Subscriptions for Active Move

```typescript
// Subscribe to both collection level and document level
const collectionChannel = `databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents`
const documentChannel = `databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents.${move.$id}`

// On any event that matches this move → update status, handle cancellation, handle completion
```

---

## 14. Scheduled Moves Screen

### 14.1 Purpose

Lists all moves the mover has accepted (`status === 'mover_accepted'`, `moveCategory === 'scheduled'`), ordered by `moveDate` ascending (soonest first).

### 14.2 Data Source

`GET /api/mover/scheduled-moves`

**Response:**
```typescript
{
  moves: ScheduledMove[],
  total: number
}
```

**ScheduledMove shape:**
```typescript
{
  id: string
  handle: string
  moveType: string
  moveCategory: string     // always 'scheduled'
  status: string           // always 'mover_accepted'
  pickupLocation: string
  pickupStreetAddress: string
  pickupLatitude: number
  pickupLongitude: number
  dropoffLocation: string
  dropoffStreetAddress: string
  dropoffLatitude: number
  dropoffLongitude: number
  homeType: string
  totalItemCount: number
  estimatedPrice: number
  additionalServices: string[]
  crewSize: string
  vehicleType: string
  moveDate: string          // ISO datetime
  arrivalWindow: string | null
  routeDistanceMeters: number
  routeDurationSeconds: number
  coverPhotoId: string | null
  galleryPhotoIds: string[]
  createdAt: string
}
```

### 14.3 Realtime Updates

Subscribe to the collection-level Moves channel. On any create/update event, re-fetch the list:

```typescript
const channel = `databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents`
client.subscribe(channel, () => {
  fetchScheduledMoves()
})
```

### 14.4 Card Display

Each move card shows:
- Move date (formatted: "Mon, 12 Jan · 09:00")
- Distance text: "X.X km route"
- Pickup → Dropoff abbreviations
- Estimated price: `€X.XX`
- Move type badge (Light / Regular / Premium)
- Item count

Tap → navigate to Job Details for further actions (Start Route, Withdraw)

---

## 15. Earnings Screen

### 15.1 Data Source

`GET /api/mover/earnings?period={period}`

**Period options:** `today` | `week` | `month` | `year`

**Response:**
```typescript
{
  total: number                // EUR, sum of completed payments in period
  moves: number                // count of completed moves
  averagePerMove: number       // total / moves
  period: string               // echoed period param
  entries: EarningsEntry[]
}
```

**EarningsEntry shape:**
```typescript
{
  id: string            // move $id
  date: string          // ISO datetime
  description: string   // "Berlin, Mitte → Hamburg, Altona" (first parts of addresses)
  amount: number        // EUR (from payment.amount or move.finalPrice or move.estimatedPrice)
  type: 'earning' | 'tip' | 'bonus'  // currently always 'earning'
  moveType: string      // 'light' | 'regular' | 'premium'
}
```

### 15.2 Stats Display

| Stat | Field |
|---|---|
| Total Earnings | `€{total.toFixed(2)}` |
| Moves Completed | `{moves}` |
| Average per Move | `€{averagePerMove.toFixed(2)}` |

### 15.3 Period Selector

Tab bar or segmented control: Today | This Week | This Month | This Year

Default selection: `week`

---

## 16. Crew Management Screen

### 16.1 Purpose

CRUD operations for the mover's crew members. Crew are stored separately from the mover profile and represent the team working under the mover.

### 16.2 API Endpoints

| Operation | Method | Endpoint | Body |
|---|---|---|---|
| List crew | GET | `/api/crew` | — |
| Add member | POST | `/api/crew` | `{ name, phone, role }` |
| Update member | PATCH | `/api/crew/{id}` | `{ name?, phone?, role?, isActive? }` |
| Remove member | DELETE | `/api/crew/{id}` | — |

**Response for GET:**
```typescript
{ crewMembers: CrewMemberDoc[] }
```

**Response for POST:**
```typescript
{ crewMember: CrewMemberDoc }
```

**Response for PATCH:**
```typescript
{ crewMember: CrewMemberDoc }
```

**Response for DELETE:**
```typescript
{ success: true }
```

### 16.3 Crew Member Shape

```typescript
interface CrewMember {
  id: string              // $id
  name: string
  phone: string
  photo?: string          // Storage file ID (optional)
  role: 'driver' | 'helper'
  isActive: boolean
}
```

### 16.4 Add Member Form

Required fields:
- `name` — text input
- `phone` — phone input with country code
- `role` — picker: `'driver'` | `'helper'`

`isActive` defaults to `true` on creation.

### 16.5 Context Integration

The user context in the web app maintains `crewMembers[]` in memory and exposes `addCrewMember`, `updateCrewMember`, `removeCrewMember`. In the mobile app, maintain equivalent local state or use a global store (Zustand / Context).

---

## 17. Settings Screen

### 17.1 Editable Fields

Grouped into sections:

**Profile Section:**
| Field | Edit Method | API |
|---|---|---|
| Profile photo | Image picker → upload → update | `POST /api/user/upload-photo`, then `PATCH /api/user/profile { profilePhoto: fileId }` |
| Full name | Text modal | `PATCH /api/user/profile { fullName }` |
| Email | Email modal (with warning about verification) | `POST /api/user/change-email { email }` |
| Phone | Phone modal | `POST /api/user/change-phone { phone }` |

**Vehicle Section:**
| Field | Notes |
|---|---|
| Vehicle brand | Text |
| Vehicle model | Text |
| Vehicle year | Text / number |
| Vehicle capacity (kg) | Number |
| Registration plate | Text |
| Vehicle type | Picker: small_van / medium_truck / large_truck |

Vehicle updates are saved via `PATCH /api/user/profile` (or a dedicated vehicle endpoint if implemented).

### 17.2 Read-Only Fields

These are shown but cannot be edited from the settings screen (require support contact):
- Years of experience
- Base rate (EUR/km)
- Verification status
- Languages spoken (could be editable via profile update)

---

## 18. Move Request Popup

### 18.1 Purpose

When a client creates an **instant move**, the `broadcast-move-request` cloud function creates `move_request` documents for nearby movers. Each mover receives a popup notification with move details and countdown timer.

### 18.2 Trigger

**Realtime subscription** on the `move_requests` collection. When a new document is created with `moverProfileId === currentMoverProfile.$id` and `status === 'pending'`:

```typescript
const channel = `databases.${DATABASE_ID}.collections.${MOVE_REQUESTS_COLLECTION}.documents`

client.subscribe(channel, async (response) => {
  const events = response.events || []
  if (!events.some(e => e.includes('.create'))) return
  
  const doc = response.payload
  
  // Extract moverProfileId (may be string or relationship object)
  const docMoverProfileId = typeof doc.moverProfileId === 'string'
    ? doc.moverProfileId
    : doc.moverProfileId?.$id || ''
  
  if (docMoverProfileId !== currentMoverProfile.$id) return
  if (doc.status !== 'pending') return
  
  // Fetch move details
  const move = await fetchMoveDetails(doc.moveId)  // GET /api/moves/{moveId}/full
  
  showMoveRequestPopup({
    requestId: doc.$id,
    moveId: doc.moveId,
    expiresAt: doc.expiresAt,
    move,
  })
})
```

### 18.3 Popup Behavior

- **Displays**: Full-screen modal overlay with move details (map preview, pickup/dropoff, items, distance, estimated price)
- **Countdown timer**: Calculates remaining seconds from `expiresAt`. Default 180s if `expiresAt` missing.
- **Alarm sound**: Play an urgent notification sound (two-tone siren) in a loop while popup is visible
- **Auto-dismiss**: When countdown reaches 0 → close popup (auto-decline)
- **Fallback polling**: Also poll `move_requests` collection every 5 seconds (in case Realtime is missed)

### 18.4 Move Details View (Inside Popup)

The popup has two states:
1. **Summary view**: Quick overview with accept/decline buttons
2. **Details view**: Full details screen (tapping "View Details" expands)

Information shown:
- Gallery photos (if any)
- Pickup and dropoff addresses
- Move date and time (for scheduled) or "Immediate" (for instant)
- Home type, crew size required, vehicle type required
- Item count and weight estimate
- Packing level and additional services
- Route distance and estimated duration
- Estimated price
- Payment method

### 18.5 Accept Action

```typescript
// POST /api/mover/accept-move
// Body: { requestId: string, moveId: string }
// This also declines all other pending requests for this move

const response = await fetch('/api/mover/accept-move', {
  method: 'POST',
  body: JSON.stringify({ requestId, moveId }),
})
// On success → navigate to Active Move screen
```

### 18.6 Decline Action

```typescript
// POST /api/mover/decline-move
// Body: { requestId: string }

const response = await fetch('/api/mover/decline-move', {
  method: 'POST',
  body: JSON.stringify({ requestId }),
})
// On success → close popup
```

### 18.7 Move Details Fetch

The popup fetches full move details from:
`GET /api/moves/{moveId}/full` → returns `{ move: MoveDetails, mover: MoverProfileDoc }`

```typescript
interface MoveDetails {
  $id: string
  handle: string | null
  status: string
  moveType: string | null
  moveCategory: string | null
  moveDate: string | null
  pickupLocation: string | null
  pickupStreetAddress: string | null
  dropoffLocation: string | null
  dropoffStreetAddress: string | null
  totalItemCount: number | null
  totalWeightKg: number | null
  estimatedPrice: number | null
  crewSize: string | null
  vehicleType: string | null
  coverPhotoId: string | null
  galleryPhotoIds: string[]
  routeDistanceMeters: number | null
  routeDurationSeconds: number | null
  homeType: string | null
  contactFullName: string | null
  packingServiceLevel: string | null
  additionalServices: string[]
}
```

---

## 19. GPS Location Broadcasting

### 19.1 Purpose

Continuously broadcast the mover's GPS coordinates so:
1. Clients can see the mover moving on the map in real-time during active moves
2. The system can discover the mover for nearby move broadcasts
3. The `currentLatitude`/`currentLongitude` on `mover_profiles` stays fresh

### 19.2 When to Broadcast

| Context | Interval | GPS Mode |
|---|---|---|
| Global (mover online, verified) | 30 seconds | `watchPosition` — low frequency |
| Active move (`mover_en_route`, `in_transit`) | 3 seconds | `watchPosition` — high frequency |

### 19.3 API Endpoint

`POST /api/mover/update-location`

**Body:**
```typescript
{
  latitude: number    // required
  longitude: number   // required
  heading: number | null    // compass degrees
  speed: number | null      // km/h
  moveId: string | null     // the active move $id if applicable
}
```

**Effect:**
1. Creates a new `mover_locations` document (triggers Realtime broadcast to clients)
2. Updates `mover_profiles.currentLatitude` and `currentLongitude`
3. Sets `mover_profiles.isOnline = true`

### 19.4 React Native Implementation

```typescript
import * as Location from 'expo-location'

// Global background broadcast (low frequency)
let globalSubscription: Location.LocationSubscription | null = null

async function startGlobalBroadcast() {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') return

  globalSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,  // 30 seconds
      distanceInterval: 50, // or 50m movement
    },
    (position) => {
      broadcastLocation(position, null) // no moveId for general broadcasting
    }
  )
}

// Active move broadcast (high frequency) — use separate subscription
async function startActiveMoveTracking(moveId: string) {
  const activeMoveSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 3000,   // 3 seconds
      distanceInterval: 0,
    },
    (position) => {
      broadcastLocation(position, moveId)
    }
  )
  return activeMoveSubscription
}

let lastBroadcast = 0

async function broadcastLocation(position: Location.LocationObject, moveId: string | null) {
  const now = Date.now()
  // Throttle in active move mode isn't needed since interval handles it
  // But keep a minimum gap to avoid race conditions
  if (now - lastBroadcast < 2000) return
  lastBroadcast = now

  await fetch('/api/mover/update-location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
      moveId,
    }),
  })
}
```

### 19.5 Background Location (Important for Mobile)

For active moves, the mover app **must** broadcast location even when the app is in background. This requires:
- **iOS**: `UIBackgroundModes: location` in `Info.plist`, and calling `startBackgroundUpdateTask`
- **Android**: Foreground service with location permission, or `BACKGROUND_LOCATION` permission
- Use `expo-location`'s `startLocationUpdatesAsync` with a background task definition

```typescript
// Define background task (register once at app start)
TaskManager.defineTask('background-location', async ({ data: { locations } }) => {
  const location = locations[0]
  await broadcastLocation(location, currentActiveMoveId)
})

// Start background tracking
await Location.startLocationUpdatesAsync('background-location', {
  accuracy: Location.Accuracy.High,
  timeInterval: 3000,
  showsBackgroundLocationIndicator: true,  // iOS blue bar
  foregroundService: {
    notificationTitle: 'PickLT Active Move',
    notificationBody: 'Tracking your location for the client',
  },
})
```

---

## 20. Complete API Reference

All endpoints are on the Next.js web app at `${API_BASE_URL}/api/...`

**Authentication note**: The web app uses a `picklt_session` cookie (HMAC-signed). For mobile, you need to either:
1. Implement cookie-based auth by storing the session token and sending it as the `Cookie` header
2. Or add a new Bearer token auth mechanism to the API routes

### 20.1 Auth Endpoints

#### `POST /api/auth/init-session`
Creates the server-side session cookie after Appwrite authentication.
```typescript
// Body: { userId: string }  — Appwrite Auth user $id
// Response: { success: true }
// Sets: httpOnly 'picklt_session' cookie (30-day max age)
```

#### `POST /api/auth/sync-user`
Syncs Appwrite auth user with the custom users collection. Returns full profile.
```typescript
// Body:
{
  authId: string        // Appwrite Auth user $id
  email: string
  fullName: string
  phone: string
  emailVerified: boolean
  phoneVerified: boolean
  userType?: string     // pending user type (optional, from localStorage in web)
}

// Response:
{
  user: UserDoc
  moverProfile: MoverProfileDoc | null
  crewMembers: CrewMemberDoc[]
}
```

#### `POST /api/auth/set-phone`
Sets a phone number on the Appwrite Auth account (needed for Google OAuth users who don't have a password).
```typescript
// Body: { phone: string }  — must include country code (e.g. "+49123456789")
// Response: { success: true }
```

#### `POST /api/auth/clear-session`
Clears the session cookie on logout.
```typescript
// Body: none
// Response: { success: true }
// Effect: sets cookie maxAge to 0
```

---

### 20.2 Mover Profile

#### `POST /api/mover/submit-profile`
Creates or updates the mover's profile. This is the final submit action of the onboarding wizard.

```typescript
// Body:
{
  fullName: string
  phone: string                      // with country code
  driversLicense: string             // license number
  driversLicensePhoto: string | null // storage file ID
  selfiePhoto: string | null         // storage file ID (becomes profile photo)
  socialSecurityNumber: string
  taxNumber: string
  primaryCity: string
  primaryCountry: string
  vehicleBrand: string
  vehicleModel: string
  vehicleYear: string
  vehicleCapacity: string           // kg
  vehicleRegistration: string
  vehicleType: 'small_van' | 'medium_truck' | 'large_truck'
  languages: string[]
  yearsExperience: number
  baseRate: number
}

// Response:
{
  success: true
  profileId: string    // mover_profiles.$id
}

// Business rules:
// - Client accounts (userType === 'client') are BLOCKED (403)
// - If profile exists → updates (upsert behavior)
// - Sets verificationStatus = 'pending_verification'
// - Updates user.userType = 'mover'
// - Creates a notification for the mover
```

---

### 20.3 Dashboard & Discovery

#### `GET /api/mover/dashboard`
```typescript
// Response:
{
  moverProfile: MoverProfileDoc
  activeMoves: MoveDoc[]
  activeMovesCount: number
  scheduledMovesCount: number
  completedThisMonth: number
  pendingRequests: MoveRequestDoc[]
  crewMembers: CrewMemberDoc[]
  earningsThisMonth: number         // EUR
  recentMoves: {
    $id: string
    pickupLabel: string
    pickupAddress: string
    dropoffLabel: string
    dropoffAddress: string
    scheduledDate: string
    status: string
    estimatedPrice: number
    moveCategory: string
    totalItems: number
    routeDistanceMeters: number | null
  }[]
}
```

#### `GET /api/mover/nearby-moves?lat={lat}&lng={lng}`
```typescript
// Query params:
// lat?: number      — current GPS latitude (optional, falls back to profile coords)
// lng?: number      — current GPS longitude (optional, falls back to profile coords)

// Response:
{
  moves: NearbyMove[]  // see Section 11.3 for shape
}

// Filters: scheduled + draft/booked + within 30km + future date + not own moves
// Sorted: by $createdAt descending
```

---

### 20.4 Scheduled Move Actions

#### `POST /api/mover/accept-scheduled-move`
```typescript
// Body: { moveId: string }

// Guards:
// - moverProfile must exist
// - verificationStatus must be 'verified'
// - move.moveCategory must be 'scheduled'
// - move.moverProfileId must be null (no one assigned)
// - move.status must be in ['draft', 'booked', 'paid', 'pending_payment']

// Action: sets moverProfileId = moverProfile.$id, status = 'mover_accepted'

// Response:
{ success: true, moveId: string, moverProfileId: string }

// Error codes: 400, 401, 403, 404, 409 (conflict if already assigned)
```

#### `POST /api/mover/withdraw-scheduled-move`
```typescript
// Body: { moveId: string }

// Guards:
// - moverProfile must exist
// - verificationStatus must be 'verified'
// - move.moverProfileId must equal this mover's profile $id
// - move.status must be in ['mover_accepted', 'mover_assigned', 'draft', 'booked', 'paid', 'pending_payment']
// NOTE: Cannot withdraw once mover_en_route has started

// Action: sets moverProfileId = null, status = 'booked'

// Response:
{ success: true, moveId: string }
```

---

### 20.5 Active Move

#### `GET /api/mover/active-move`
```typescript
// Response:
{
  move: MoveDoc | null   // null if no active move
}

// Definition of "active move":
// Primary query: status IN ['mover_en_route', 'mover_arrived', 'loading', 'in_transit',
//                           'arrived_destination', 'unloading', 'awaiting_payment']
// Fallback: instant move with status = 'mover_accepted' (to auto-transition)
// Returns latest updated move if multiple (shouldn't happen)
```

#### `POST /api/mover/update-move-status`
```typescript
// Body:
{
  moveId: string
  status: string        // target status (see Section 7.2 for valid transitions)
  finalPrice?: number   // optional, used when transitioning to awaiting_payment
}

// Guards:
// - verificationStatus must be 'verified'
// - move.moverProfileId must equal this mover's profile $id
// - transition must be valid (Section 7.2)
// - Date guard: mover_accepted → mover_en_route only allowed on or after moveDate

// Side effects:
// - Transition to 'awaiting_payment': creates payments record { status: 'pending', paymentMethod: 'cash', amount: finalPrice || estimatedPrice }

// Response:
{ success: true, moveId: string, status: string }

// Error codes: 400 (invalid transition), 401, 403, 404
```

#### `POST /api/mover/confirm-payment`
```typescript
// Body: { moveId: string }

// Guards:
// - verificationStatus must be 'verified'
// - move.moverProfileId must equal this mover's profile $id
// - move.status must be 'awaiting_payment'

// Action:
// 1. Finds or creates pending payment record
// 2. Sets payment.moverConfirmedAt = now
// 3. If payment.clientConfirmedAt already set:
//    a. Sets payment.status = 'completed'
//    b. Sets move.status = 'completed'
//    c. Sets move.completedAt, move.paidAt, move.finalPrice
//    d. Increments moverProfile.totalMoves++

// Response (partial — mover confirmed but client hasn't yet):
{ success: true, paymentStatus: 'pending', message: 'Mover payment confirmed. Waiting for client confirmation.' }

// Response (both confirmed — move completed):
{ success: true, paymentStatus: 'completed', moveStatus: 'completed', moveCompleted: true }
```

---

### 20.6 Instant Move Request Handling

#### `POST /api/mover/accept-move`
```typescript
// Body: { requestId: string, moveId: string }

// Guards:
// - verificationStatus must be 'verified'
// - moveRequest.moverProfileId must equal this mover's profile $id
// - moveRequest.status must be 'pending'

// Action:
// 1. Updates move_requests.status = 'accepted', respondedAt = now
// 2. Updates moves.moverProfileId = moverProfile.$id, status = 'mover_accepted'
// 3. Best-effort: declines all other pending requests for the same move

// Response:
{ success: true }
```

#### `POST /api/mover/decline-move`
```typescript
// Body: { requestId: string }

// Guards:
// - verificationStatus must be 'verified'
// - moveRequest.moverProfileId must equal this mover's profile $id
// - moveRequest.status must be 'pending'

// Action: Updates move_requests.status = 'declined', respondedAt = now

// Response:
{ success: true }
```

---

### 20.7 Scheduled Moves List

#### `GET /api/mover/scheduled-moves`
```typescript
// Response:
{
  moves: ScheduledMove[]   // see Section 14.2 for shape
  total: number
}

// Query: moverProfileId = this mover, moveCategory = 'scheduled', status = 'mover_accepted'
// Sorted: by moveDate ascending
```

---

### 20.8 Earnings

#### `GET /api/mover/earnings?period={period}`
```typescript
// period: 'today' | 'week' | 'month' | 'year'

// Response:
{
  total: number             // EUR
  moves: number             // count
  entries: EarningsEntry[]  // see Section 15.1
  period: string
  averagePerMove: number
}

// Logic: queries completed moves in date range → finds completed payments → sums amounts
```

---

### 20.9 Location

#### `POST /api/mover/update-location`
```typescript
// Body:
{
  latitude: number    // required
  longitude: number   // required
  heading?: number | null
  speed?: number | null
  moveId?: string | null
}

// Action:
// 1. Creates mover_locations document (Realtime broadcasts this)
// 2. Updates mover_profiles: currentLatitude, currentLongitude, isOnline = true

// Response: { success: true }
```

---

### 20.10 Crew Members

#### `GET /api/crew`
```typescript
// Response: { crewMembers: CrewMemberDoc[] }
```

#### `POST /api/crew`
```typescript
// Body:
{
  name: string       // required
  phone: string      // required
  role?: 'driver' | 'helper'   // defaults to 'helper'
}

// Response: { crewMember: CrewMemberDoc }
```

#### `PATCH /api/crew/{id}`
```typescript
// Body (all optional):
{
  name?: string
  phone?: string
  role?: 'driver' | 'helper'
  isActive?: boolean
}

// Response: { crewMember: CrewMemberDoc }
```

#### `DELETE /api/crew/{id}`
```typescript
// Response: { success: true }
```

---

### 20.11 User Profile

#### `PATCH /api/user/profile`
```typescript
// Body (all optional, update only what's provided):
{
  fullName?: string
  phone?: string
  profilePhoto?: string    // storage file ID
  vehicleBrand?: string
  vehicleModel?: string
  vehicleYear?: string
  vehicleCapacity?: string
  vehicleRegistration?: string
  vehicleType?: string
}
```

#### `POST /api/user/upload-photo`
```typescript
// Multipart form data:
// file: Blob/File
// bucket: 'profile-photos' | 'move-photos'

// Response: { fileId: string, url: string }
```

#### `POST /api/user/change-email`
```typescript
// Body: { email: string }
// Response: { success: true }
```

#### `POST /api/user/change-phone`
```typescript
// Body: { phone: string }   — with country code
// Response: { success: true }
```

---

## 21. Realtime Subscriptions

The mobile app should maintain these Appwrite Realtime subscriptions:

### 21.1 Move Request Notifications (Always Active for Verified Movers)

```typescript
// Channel: all move_requests documents
`databases.${DATABASE_ID}.collections.${MOVE_REQUESTS_COLLECTION}.documents`

// Filter in app: events.includes('.create') && doc.moverProfileId === currentMoverProfile.$id && doc.status === 'pending'
// Action: show MoveRequestPopup
```

### 21.2 Active Move Status Updates

```typescript
// Subscribe to BOTH collection and document level

// Collection level (catches new moves assigned to mover)
`databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents`

// Document level (catches specific move status changes)
`databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents.${activeMoveId}`

// Action: refresh move status on any event matching this move's ID
```

### 21.3 Scheduled Moves List Updates

```typescript
// Collection level subscription — triggers re-fetch of scheduled moves list
`databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents`

// Action: re-fetch GET /api/mover/scheduled-moves when any moves collection event fires
```

### 21.4 Mover Location (Client-side — for Active Move map)

```typescript
// The client app subscribes to this. The mover app WRITES to it.
// But if the mover app also shows the client location on a shared map:
`databases.${DATABASE_ID}.collections.${MOVER_LOCATIONS_COLLECTION}.documents`
```

### 21.5 Appwrite Realtime Setup (React Native)

```typescript
import { Client } from 'react-native-appwrite'

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(PROJECT_ID)
  .setPlatform('io.picklt.mover')

// Subscribe
const unsubscribe = client.subscribe(channel, (response) => {
  const { events, payload } = response
  // events: string[] — e.g. ['databases.X.collections.Y.documents.Z.create']
  // payload: the document
})

// Cleanup
unsubscribe()
```

---

## 22. Cloud Functions

The following Appwrite Cloud Functions exist. The mobile app may call them directly or via the Next.js API proxy.

| Function | Trigger | Purpose |
|---|---|---|
| `create-move` | HTTP POST | Create a move with full validation and classification |
| `update-move-status` | HTTP POST | Transition move status with business logic + notifications |
| `update-mover-location` | HTTP POST | GPS tracking — writes to mover_locations |
| `respond-move-request` | HTTP POST | Mover accepts/declines instant move request |
| `calculate-price` | HTTP POST | Calculate move price based on route + items |
| `process-payment` | HTTP POST | Handle payment processing |
| `submit-mover-profile` | HTTP POST | Mover registration/onboarding |
| `admin-verify-mover` | HTTP POST | Admin approves/rejects mover applications |
| `send-notification` | Appwrite Event | Auto-send notifications on move_status_history creation |
| `submit-review` | HTTP POST | Client submits review after move completion |
| `broadcast-move-request` | HTTP POST | Find nearby movers and broadcast instant move |
| `expire-move-requests` | CRON (every 30s) | Auto-expire unanswered move requests |

> **Note**: The actual web app has **replaced** most cloud function calls with Next.js API routes for simplicity. The mobile app can and should call the Next.js API routes directly rather than cloud functions.

---

## 23. Mobile Integration Notes

### 23.1 Appwrite SDK for React Native

**Package**: `react-native-appwrite` (official Appwrite SDK)

```bash
npm install react-native-appwrite
```

**Client initialization:**
```typescript
import { Client, Account, Databases, Storage, Query, ID } from 'react-native-appwrite'

export const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('698fcc80001f0b5149d8')
  .setPlatform('io.picklt.mover')  // iOS bundle ID or Android package name

export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)
```

**Note**: Set the platform to your app's bundle identifier. This is required for Appwrite to allowlist the app for OAuth and other flows.

### 23.2 Session Persistence

```typescript
// React Native Appwrite SDK automatically persists sessions using AsyncStorage
// No manual session management needed for Appwrite SDK calls

// For Next.js API routes, you need to extract the session token and send it:
const sessions = await account.listSessions()
const sessionId = sessions.sessions[0].$id
// Send as: Cookie: a_session_{projectId}={sessionId}
// Or implement a new auth mechanism on the API routes
```

### 23.3 Recommended Auth Strategy for Mobile

Instead of the cookie-based session system, implement a **JWT or Header-based auth** on the Next.js API routes for the mobile app:

Option 1 — **Pass Appwrite session as cookie** (simplest):
```typescript
// After login, get the session secret from Appwrite
const session = await account.createEmailPasswordSession(email, password)
// Store session.$secret securely in SecureStore
// Send with API requests: Cookie: a_session_698fcc80001f0b5149d8=${session.$secret}
```

Option 2 — **Use Appwrite JWT** (recommended):
```typescript
// Create a JWT from the active session
const jwt = await account.createJWT()  // expires in 15 minutes
// Send as: Authorization: Bearer ${jwt.jwt}
// Add JWT verification to Next.js API routes using node-appwrite Account.get()
```

Option 3 — **Call Appwrite directly** (bypass Next.js API routes entirely):
For all operations that don't need Next.js business logic, call Appwrite directly from the mobile app using the official SDK with proper collection permissions.

### 23.4 Maps — React Native Mapbox vs Alternatives

The web app uses **Mapbox GL JS**. For React Native:
- **`@rnmapbox/maps`** — Official Mapbox React Native SDK (recommended for consistency)
- **`expo-maps`** / `react-native-maps` — Alternative using Google Maps / Apple Maps (simpler setup)

**Mapbox Directions API** (for ETA) is a pure HTTP API and works the same on mobile:
```typescript
const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${lng},${lat};${targetLng},${targetLat}?access_token=${MAPBOX_TOKEN}&overview=false`
const res = await fetch(url)
const { routes } = await res.json()
const { distance, duration } = routes[0]
// distance in meters, duration in seconds
```

### 23.5 Notification Sound for Move Requests

The web app generates a WAV alarm sound using AudioContext. For React Native, use:
```typescript
import { Audio } from 'expo-av'

const { sound } = await Audio.Sound.createAsync(
  require('./assets/alarm.mp3')  // include an alarm sound file
)
await sound.setIsLoopingAsync(true)
await sound.playAsync()

// On dismiss:
await sound.stopAsync()
await sound.unloadAsync()
```

### 23.6 Push Notifications for Move Requests

Beyond Realtime subscriptions, implement push notifications for move requests:

1. Use **Expo Push Notifications** (`expo-notifications`) or **FCM + APNs** directly
2. When a mover is offline (app closed), the Appwrite `send-notification` cloud function should trigger a push notification
3. Register device token with the backend and store it in the `users` or `mover_profiles` collection
4. The `broadcast-move-request` cloud function sends push notifications to targeted movers

### 23.7 Background Tasks

Required background capabilities:
- **GPS broadcasting** during active moves (see Section 19.5)
- **Incoming move request detection** when app is in background (push notifications handle this)

### 23.8 Key Formatting Functions

```typescript
// Format duration: seconds → "X h Y min" or "Y min"
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.ceil((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

// Format distance: meters → "X.X km" or "X m"
function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

// Format move date display
function formatMoveDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Haversine distance (km)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Photo URL from file ID
function getPhotoUrl(fileId: string, bucket: 'profile-photos' | 'move-photos'): string {
  const BUCKET_ID = bucket === 'profile-photos' ? PROFILE_PHOTOS_BUCKET : MOVE_PHOTOS_BUCKET
  return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`
}

// Handle relationship fields (Appwrite may return string or { $id: string })
function extractId(field: unknown): string | null {
  if (typeof field === 'string') return field
  if (field && typeof field === 'object' && '$id' in (field as object)) {
    return (field as Record<string, string>).$id || null
  }
  return null
}
```

### 23.9 Error Handling Patterns

All API routes return consistent error responses:
```typescript
// Error: { error: string }  with appropriate HTTP status code
// Success: varies by endpoint

// Common status codes:
// 400 — Bad request (missing fields, invalid transition)
// 401 — Unauthorized (no session)
// 403 — Forbidden (wrong account type, not verified, not assigned mover)
// 404 — Not found (no mover profile, no move)
// 409 — Conflict (move already assigned, request no longer pending)
// 500 — Internal server error
```

### 23.10 Relationship Field Warning

Appwrite relationship fields can be returned as either a **string ID** or a **full document object** depending on query parameters. Always extract IDs defensively:

```typescript
// WRONG (may fail if relationship is returned as object):
const moverId = move.moverProfileId

// CORRECT:
const moverId = typeof move.moverProfileId === 'string'
  ? move.moverProfileId
  : move.moverProfileId?.$id || null
```

This pattern is used throughout the web app's API routes and must be replicated in the mobile app's SDK calls.

### 23.11 Move Request Popup — Timing Details

| Field | Value |
|---|---|
| Default countdown | 180 seconds (3 minutes) |
| Real countdown | `(expiresAt - now) / 1000` seconds |
| `expiresAt` | Set by `broadcast-move-request` cloud function (60s for instant moves) |
| Auto-dismiss | When countdown reaches 0 |
| Fallback poll | Every 5 seconds (in case Realtime misses the event) |

### 23.12 Complete Profile — Re-submit Behavior

The `POST /api/mover/submit-profile` endpoint is **idempotent** — if a profile already exists for the user, it updates it instead of creating a duplicate. This handles the case where the mover started onboarding but didn't finish (partial profile saved).

### 23.13 Active Move — No Active Move State

When there is no active move (`GET /api/mover/active-move` returns `{ move: null }`), show:
- Empty state: "No active move. Find moves in the Available Moves section."
- Button: "Find Moves" → navigate to Available Moves screen

---

## Appendix A — Move Status Diagram

```
                    [booked/draft]
                          │
              ┌───────────┴──────────────┐
              │ Scheduled flow           │ Instant flow
              ▼                          ▼
    mover_accepted                 mover_assigned
    (via accept-scheduled-move)    (via broadcast)
              │                          │
              └──────────┬───────────────┘
                         │ update-move-status: mover_en_route
                         ▼
                   mover_en_route  ────── GPS tracking 3s ──────►
                         │
                         │ update-move-status: mover_arrived
                         ▼
                    mover_arrived
                         │
                         │ update-move-status: loading
                         ▼
                       loading
                         │
                         │ update-move-status: in_transit
                         ▼
                      in_transit  ────── GPS tracking 3s ──────►
                         │
                         │ update-move-status: arrived_destination
                         ▼
                  arrived_destination
                         │
                         │ update-move-status: unloading
                         ▼
                       unloading
                         │
                         │ update-move-status: awaiting_payment
                         │ ↳ CREATES payment record { status: 'pending' }
                         ▼
                  awaiting_payment ◄─── poll /payment-status every 5s
                         │
                         │ Both mover + client confirm-payment
                         ▼
                       completed
                         │
                         ▼
                  [Update moverProfile.totalMoves++]
```

---

## Appendix B — Screens Summary

| Screen Name | Route (web) | Primary API | Key State |
|---|---|---|---|
| Login | `/login?type=mover` | Appwrite SDK | auth flow steps |
| Signup | `/signup?type=mover` | Appwrite SDK | auth flow steps |
| Complete Profile | `/complete-profile` | `/api/mover/submit-profile` | 5-step wizard |
| Dashboard | `/dashboard` | `/api/mover/dashboard` | stats, recent moves |
| Available Moves | `/available-moves` | `/api/mover/nearby-moves` | GPS coords, 30s poll |
| Job Details | `/job-details/:handle` | `/api/moves/by-handle/:handle` | accept/withdraw/start |
| Active Move | `/active-move` | `/api/mover/active-move` | 8-phase execution |
| Scheduled Moves | `/scheduled-moves` | `/api/mover/scheduled-moves` | realtime list |
| Earnings | `/earnings` | `/api/mover/earnings?period=` | period filter |
| My Crew | `/my-crew` | `/api/crew` | CRUD list |
| Settings | `/settings` | `/api/user/profile` | modals per field |

---

## Appendix C — Appwrite Collection IDs Mapping (env vars)

All Next.js API routes use these environment variables to reference collections:

| Env Variable | Collection Name | Used For |
|---|---|---|
| `APPWRITE_COLLECTION_USERS` | users | Auth sync, profile |
| `APPWRITE_COLLECTION_MOVER_PROFILES` | mover_profiles | All mover operations |
| `APPWRITE_COLLECTION_CREW_MEMBERS` | crew_members | Crew CRUD |
| `APPWRITE_COLLECTION_MOVES` | moves | Core move document |
| `APPWRITE_COLLECTION_MOVE_REQUESTS` | move_requests | Instant move broadcast |
| `APPWRITE_COLLECTION_MOVER_LOCATIONS` | mover_locations | GPS tracking |
| `APPWRITE_COLLECTION_MOVE_STATUS_HISTORY` | move_status_history | Audit trail |
| `APPWRITE_COLLECTION_PAYMENTS` | payments | Payment records |
| `APPWRITE_COLLECTION_REVIEWS` | reviews | Post-move reviews |
| `APPWRITE_COLLECTION_NOTIFICATIONS` | notifications | In-app notifications |
| `APPWRITE_COLLECTION_INVENTORY_CATALOG` | inventory_catalog | Item catalog |

**Public (client-side) env vars** (for Realtime subscriptions in mobile):
| Env Variable | Notes |
|---|---|
| `NEXT_PUBLIC_APPWRITE_DATABASE_ID` | Database ID |
| `NEXT_PUBLIC_COLLECTION_MOVER_LOCATIONS` | For subscribing to GPS updates |
| `NEXT_PUBLIC_COLLECTION_MOVE_REQUESTS` | For move request popup subscription |
| `NEXT_PUBLIC_COLLECTION_MOVES` | For move status subscriptions |
| `NEXT_PUBLIC_BUCKET_PROFILE_PHOTOS` | For photo URL construction |
| `NEXT_PUBLIC_BUCKET_MOVE_PHOTOS` | For move photo URL construction |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Appwrite endpoint |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Project ID |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox token |
