// ─── Appwrite Document Types for all collections ───────
// These mirror the Appwrite database schemas exactly.
// All documents include Appwrite's auto-generated fields.

import { Models } from 'appwrite'

// ─── Base ───────────────────────────────────────────────
type AppwriteDoc = Models.Document

// ─── Users ──────────────────────────────────────────────
export interface UserDoc extends AppwriteDoc {
  email: string
  fullName: string
  phone: string | null
  profilePhoto: string | null
  userType: 'client' | 'mover' | null
  emailVerified: boolean
  phoneVerified: boolean
  // Relationships
  mover_profiles: MoverProfileDoc | null
  moves: MoveDoc[]
  reviews: ReviewDoc[]
}

// ─── Mover Profiles ────────────────────────────────────
export type VehicleType = 'small_van' | 'medium_truck' | 'large_truck'
export type VerificationStatus = 'pending_verification' | 'verified' | 'suspended' | 'rejected'

export interface MoverProfileDoc extends AppwriteDoc {
  userId: UserDoc | string
  driversLicense: string | null
  driversLicensePhoto: string | null
  socialSecurityNumber: string | null
  taxNumber: string | null
  primaryCity: string | null
  primaryCountry: string | null
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: string | null
  vehicleCapacity: string | null
  vehicleRegistration: string | null
  vehicleType: VehicleType | null
  rating: number | null
  totalMoves: number | null
  yearsExperience: number | null
  verificationStatus: VerificationStatus | null
  isOnline: boolean | null
  currentLatitude: number | null
  currentLongitude: number | null
  languages: string[]
  baseRate: number | null
  // Relationships
  crew_members: CrewMemberDoc[]
  moves: MoveDoc[]
  moverLocations: MoverLocationDoc[]
}

// ─── Crew Members ──────────────────────────────────────
export type CrewRole = 'driver' | 'helper'

export interface CrewMemberDoc extends AppwriteDoc {
  moverProfileId: MoverProfileDoc | string
  name: string | null
  phone: string | null
  photo: string | null
  role: CrewRole | null
  isActive: boolean | null
}

// ─── Moves ─────────────────────────────────────────────
export type MoveStatusEnum =
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'mover_assigned'
  | 'mover_accepted'
  | 'mover_en_route'
  | 'mover_arrived'
  | 'loading'
  | 'in_transit'
  | 'arrived_destination'
  | 'unloading'
  | 'completed'
  | 'cancelled_by_client'
  | 'cancelled_by_mover'
  | 'disputed'

export type MoveCategory = 'instant' | 'scheduled'
export type MoveType = 'light' | 'regular' | 'premium'
export type HomeType = 'apartment' | 'house' | 'office' | 'storage'
export type PackingServiceLevel = 'none' | 'partial' | 'full' | 'unpacking'
export type Flexibility = 'flexible_1hr' | 'not_flexible'

export interface MoveDoc extends AppwriteDoc {
  handle: string | null
  clientId: UserDoc | string
  moverProfileId: MoverProfileDoc | string | null
  status: MoveStatusEnum | null
  moveCategory: MoveCategory | null
  moveType: MoveType | null
  systemMoveType: MoveType | null
  moveDate: string | null

  // Pickup
  pickupLocation: string | null
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

  // Home/Property
  homeType: HomeType | null

  // Inventory
  inventoryItems: string | null // JSON string: Record<string, number>
  customItems: string[] // JSON strings: CustomItem[]
  totalItemCount: number | null
  totalWeightKg: number | null
  totalVolumeCm3: number | null

  // Packing
  packingServiceLevel: PackingServiceLevel | null
  packingMaterials: string[]
  packingNotes: string | null

  // Timing
  arrivalWindow: string | null
  flexibility: Flexibility | null

  // Crew & Vehicle
  crewSize: string | null
  vehicleType: string | null

  // Services
  additionalServices: string[]
  storageWeeks: number

  // Photos
  coverPhotoId: string | null
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
  estimatedPrice: number | null
  finalPrice: number | null
  routeDistanceMeters: number | null
  routeDurationSeconds: number | null

  // Legal
  termsAccepted: boolean | null
  privacyAccepted: boolean | null

  // Timestamps
  paidAt: string | null
  completedAt: string | null

  // Relationships
  reviews: ReviewDoc | null
  moveStatusHistory: MoveStatusHistoryDoc[]
}

// ─── Move Requests ─────────────────────────────────────
export type MoveRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export interface MoveRequestDoc extends AppwriteDoc {
  moveId: MoveDoc | string
  moverProfileId: MoverProfileDoc | string
  status: MoveRequestStatus | null
  sentAt: string | null
  respondedAt: string | null
  expiresAt: string | null
}

// ─── Mover Locations ───────────────────────────────────
export interface MoverLocationDoc extends AppwriteDoc {
  moverProfileId: MoverProfileDoc | string
  moveId: MoveDoc | string
  latitude: number | null
  longitude: number | null
  heading: number | null
  speed: number | null
  timestamp: string | null
}

// ─── Move Status History ───────────────────────────────
export interface MoveStatusHistoryDoc extends AppwriteDoc {
  moveId: MoveDoc | string
  fromStatus: string
  toStatus: string
  changedBy: string
  changedAt: string
  note: string | null
}

// ─── Payments ──────────────────────────────────────────
export type PaymentStatus = 'pending' | 'completed' | 'refunded' | 'failed'

export interface PaymentDoc extends AppwriteDoc {
  moveId: MoveDoc | string
  users: UserDoc | string
  amount: number | null
  currency: string | null
  status: PaymentStatus | null
  paymentMethod: string | null
  transactionId: string | null
}

// ─── Reviews ───────────────────────────────────────────
export interface ReviewDoc extends AppwriteDoc {
  moveId: MoveDoc | string
  reviewerId: UserDoc | string
  moverProfileId: MoverProfileDoc | string
  rating: number | null
  comment: string | null
}

// ─── Notifications ─────────────────────────────────────
export type NotificationType =
  | 'move_request'
  | 'move_accepted'
  | 'mover_arrived'
  | 'move_completed'
  | 'payment'
  | 'review'
  | 'system'

export interface NotificationDoc extends AppwriteDoc {
  userId: UserDoc | string
  type: NotificationType | null
  title: string | null
  body: string | null
  data: string | null
  isRead: boolean
}

// ─── Inventory Catalog ─────────────────────────────────
export interface InventoryCatalogDoc extends AppwriteDoc {
  itemId: string | null
  name: string | null
  category: string | null
  heightCm: number | null
  widthCm: number | null
  depthCm: number | null
  weightKg: number | null
  moveClassificationWeight: number | null
  moveTypeMinimum: MoveType | null
}

// ─── Custom item (JSON stored in moves.customItems) ────
export interface CustomItem {
  id: string
  name: string
  quantity: number
  estimatedWeightKg?: number
}
