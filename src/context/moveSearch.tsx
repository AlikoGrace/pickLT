"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

export type MoveTypeKey = 'light' | 'regular' | 'premium'
export type HomeTypeKey = 'apartment' | 'house' | 'office' | 'storage'
export type FloorLevelKey = 'ground' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12'
export type ParkingKey = 'at_building' | 'nearby' | 'no_parking'
export type DropoffParkingKey = 'directly_in_front' | 'limited' | 'street_only' | 'underground' | 'loading_zone'

// Step 5 types
export type PackingServiceLevel = 'none' | 'partial' | 'full' | 'unpacking'
export type PackingMaterial = 'moving_boxes' | 'wardrobe_boxes' | 'bubble_wrap' | 'packing_paper' | 'packing_tape' | 'mattress_covers' | 'tv_protection' | 'dish_inserts' | 'furniture_blankets'

// Custom packing material
export type CustomMaterial = {
  id: string
  name: string
}

// Step 6 types
export type ArrivalWindow = string // Time format like "08:00", "09:00", etc.
export type FlexibilityOption = 'flexible_1hr' | 'not_flexible'

// Step 7 types
export type CrewSize = '1' | '2' | '3' | '4plus'
export type VehicleType = 'small_van' | 'medium_truck' | 'large_truck' | 'multiple'
export type TruckAccess = 'easy' | 'moderate' | 'difficult'

export type HeavyItem = {
  id: string
  name: string
  selected: boolean
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  weightKg?: number
}

// Step 8 types - Additional Services
export type AdditionalService = 
  | 'furniture_disassembly'
  | 'furniture_assembly'
  | 'tv_mount_remove'
  | 'appliance_disconnect'
  | 'appliance_connect'
  | 'disposal_entsorgung'
  | 'moveout_cleaning'
  | 'temporary_storage'

// Move photos type
export type MovePhoto = {
  id: string
  file: File | null
  preview: string // base64 or object URL for preview
  type: 'cover' | 'gallery'
}

// Step 9 types - Contact Information
export type ContactInfo = {
  fullName: string
  phoneNumber: string
  email: string
  notesForMovers: string
  companyName?: string
  vatId?: string
  isBusinessMove: boolean
}

// Step 10 types - Confirmation
export type LegalConsent = {
  termsAccepted: boolean
  privacyAccepted: boolean
}

// Move Status type for saved/paid moves
export type MoveStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

// Stored move type (saved after payment)
export type StoredMove = {
  id: string
  handle: string
  status: MoveStatus
  createdAt: string
  paidAt: string
  totalPrice: number
  bookingCode: string
  // Core move details
  moveType: MoveTypeKey | null
  moveDate: string | null
  pickupLocation: string
  pickupStreetAddress: string
  pickupApartmentUnit: string
  dropoffStreetAddress: string
  dropoffApartmentUnit: string
  dropoffFloorLevel: FloorLevelKey | null
  homeType: HomeTypeKey | null
  floorLevel: FloorLevelKey | null
  elevatorAvailable: boolean
  dropoffElevatorAvailable: boolean
  parkingSituation: ParkingKey | null
  dropoffParkingSituation: DropoffParkingKey | null
  // Services
  packingServiceLevel: PackingServiceLevel | null
  additionalServices: AdditionalService[]
  storageWeeks: number
  // Crew & vehicle
  crewSize: CrewSize | null
  vehicleType: VehicleType | null
  arrivalWindow: ArrivalWindow | null
  // Items
  inventoryCount: number
  // Contact
  contactInfo: ContactInfo
  // Photos
  coverPhoto: string | null
  galleryPhotos: string[]
}

// Inventory item with metadata
export type InventoryItem = {
  id: string
  name: string
  category: string
  quantity: number
  size?: 'small' | 'medium' | 'large'
  // Internal metadata for move estimation
  meta?: {
    widthCm?: number
    heightCm?: number
    depthCm?: number
    weightKg?: number
  }
}

// Custom item added by user
export type CustomItem = {
  id: string
  name: string
  quantity: number
  approxSize: string
  approxWeight: string
}

// Coordinates type for location
export type Coordinates = {
  latitude: number
  longitude: number
}

type MoveSearchState = {
  pickupLocation: string
  dropoffLocation: string
  pickupCoordinates: Coordinates | null
  dropoffCoordinates: Coordinates | null
  moveDate: string | null // ISO date YYYY-MM-DD
  moveType: MoveTypeKey | null
  isInstantMove: boolean // true for instant move, false for scheduled

  // Step 1 fields
  homeType: HomeTypeKey | null
  floorLevel: FloorLevelKey | null
  elevatorAvailable: boolean
  parkingSituation: ParkingKey | null

  // Step 2 - Pickup Address
  pickupStreetAddress: string
  pickupApartmentUnit: string
  pickupAccessNotes: string
  pickupLoadingZoneRequired: boolean
  pickupArrangeHaltverbot: boolean

  // Step 3 - Drop-off Address
  dropoffStreetAddress: string
  dropoffApartmentUnit: string
  dropoffFloorLevel: FloorLevelKey | null
  dropoffElevatorAvailable: boolean
  dropoffParkingSituation: DropoffParkingKey | null
  dropoffArrangeHaltverbot: boolean

  // Step 4 - Inventory
  inventory: Record<string, number> // itemId -> quantity
  customItems: CustomItem[]

  // Step 5 - Packing Services
  packingServiceLevel: PackingServiceLevel | null
  packingMaterials: PackingMaterial[]
  customMaterials: CustomMaterial[]
  packingBoxQuantities: Record<string, number> // box type -> quantity
  packingNotes: string

  // Step 6 - Move Timing
  arrivalWindow: ArrivalWindow | null
  flexibility: FlexibilityOption | null
  preferEarliestArrival: boolean
  avoidLunchBreak: boolean
  avoidEveningDelivery: boolean

  // Step 7 - Crew & Vehicle
  crewSize: CrewSize | null
  vehicleType: VehicleType | null
  truckAccess: TruckAccess | null
  heavyItems: HeavyItem[]
  customHeavyItems: HeavyItem[]

  // Step 8 - Additional Services
  additionalServices: AdditionalService[]
  storageWeeks: number
  disposalItems: string
  coverPhoto: string | null // base64 or URL
  galleryPhotos: string[] // array of base64 or URLs

  // Step 9 - Contact Information
  contactInfo: ContactInfo

  // Step 10 - Legal Consent
  legalConsent: LegalConsent

  // Stored moves (paid/completed)
  storedMoves: StoredMove[]
}

type MoveSearchActions = {
  setPickupLocation: (v: string) => void
  setDropoffLocation: (v: string) => void
  setPickupCoordinates: (c: Coordinates | null) => void
  setDropoffCoordinates: (c: Coordinates | null) => void
  setMoveDate: (d: string | null) => void
  setMoveType: (t: MoveTypeKey | null) => void
  setIsInstantMove: (b: boolean) => void

  setHomeType: (h: HomeTypeKey | null) => void
  setFloorLevel: (f: FloorLevelKey | null) => void
  setElevatorAvailable: (b: boolean) => void
  setParkingSituation: (p: ParkingKey | null) => void

  // Step 2 actions
  setPickupStreetAddress: (v: string) => void
  setPickupApartmentUnit: (v: string) => void
  setPickupAccessNotes: (v: string) => void
  setPickupLoadingZoneRequired: (b: boolean) => void
  setPickupArrangeHaltverbot: (b: boolean) => void

  // Step 3 actions
  setDropoffStreetAddress: (v: string) => void
  setDropoffApartmentUnit: (v: string) => void
  setDropoffFloorLevel: (f: FloorLevelKey | null) => void
  setDropoffElevatorAvailable: (b: boolean) => void
  setDropoffParkingSituation: (p: DropoffParkingKey | null) => void
  setDropoffArrangeHaltverbot: (b: boolean) => void

  // Step 4 actions
  setInventoryItem: (itemId: string, quantity: number) => void
  addCustomItem: (item: CustomItem) => void
  removeCustomItem: (itemId: string) => void
  updateCustomItem: (itemId: string, item: Partial<CustomItem>) => void

  // Step 5 actions
  setPackingServiceLevel: (level: PackingServiceLevel | null) => void
  togglePackingMaterial: (material: PackingMaterial) => void
  addCustomMaterial: (material: CustomMaterial) => void
  removeCustomMaterial: (id: string) => void
  setPackingBoxQuantity: (boxType: string, quantity: number) => void
  setPackingNotes: (notes: string) => void

  // Step 6 actions
  setArrivalWindow: (window: ArrivalWindow | null) => void
  setFlexibility: (flexibility: FlexibilityOption | null) => void
  setPreferEarliestArrival: (prefer: boolean) => void
  setAvoidLunchBreak: (avoid: boolean) => void
  setAvoidEveningDelivery: (avoid: boolean) => void

  // Step 7 actions
  setCrewSize: (size: CrewSize | null) => void
  setVehicleType: (type: VehicleType | null) => void
  setTruckAccess: (access: TruckAccess | null) => void
  toggleHeavyItem: (itemId: string) => void
  updateHeavyItemDimensions: (itemId: string, dimensions: Partial<HeavyItem>) => void
  addCustomHeavyItem: (item: HeavyItem) => void
  removeCustomHeavyItem: (itemId: string) => void

  // Step 8 actions
  toggleAdditionalService: (service: AdditionalService) => void
  setStorageWeeks: (weeks: number) => void
  setDisposalItems: (items: string) => void
  setCoverPhoto: (photo: string | null) => void
  addGalleryPhoto: (photo: string) => void
  removeGalleryPhoto: (index: number) => void

  // Step 9 actions
  updateContactInfo: (info: Partial<ContactInfo>) => void

  // Step 10 actions
  setTermsAccepted: (accepted: boolean) => void
  setPrivacyAccepted: (accepted: boolean) => void

  // Stored moves actions
  addStoredMove: (move: StoredMove) => void
  updateMoveStatus: (moveId: string, status: MoveStatus) => void
  getMoveByHandle: (handle: string) => StoredMove | undefined
  getFilteredMoves: (status?: MoveStatus) => StoredMove[]

  reset: () => void
}

const defaultState: MoveSearchState = {
  pickupLocation: '',
  dropoffLocation: '',
  pickupCoordinates: null,
  dropoffCoordinates: null,
  moveDate: null,
  moveType: null,
  isInstantMove: false,
  homeType: null,
  floorLevel: null,
  elevatorAvailable: false,
  parkingSituation: null,

  // Step 2
  pickupStreetAddress: '',
  pickupApartmentUnit: '',
  pickupAccessNotes: '',
  pickupLoadingZoneRequired: false,
  pickupArrangeHaltverbot: false,

  // Step 3
  dropoffStreetAddress: '',
  dropoffApartmentUnit: '',
  dropoffFloorLevel: null,
  dropoffElevatorAvailable: false,
  dropoffParkingSituation: null,
  dropoffArrangeHaltverbot: false,

  // Step 4
  inventory: {},
  customItems: [],

  // Step 5
  packingServiceLevel: null,
  packingMaterials: [],
  customMaterials: [],
  packingBoxQuantities: {},
  packingNotes: '',

  // Step 6
  arrivalWindow: null,
  flexibility: null,
  preferEarliestArrival: false,
  avoidLunchBreak: false,
  avoidEveningDelivery: false,

  // Step 7
  crewSize: null,
  vehicleType: null,
  truckAccess: null,
  heavyItems: [],
  customHeavyItems: [],

  // Step 8
  additionalServices: [],
  storageWeeks: 0,
  disposalItems: '',
  coverPhoto: null,
  galleryPhotos: [],

  // Step 9
  contactInfo: {
    fullName: '',
    phoneNumber: '',
    email: '',
    notesForMovers: '',
    companyName: '',
    vatId: '',
    isBusinessMove: false,
  },

  // Step 10
  legalConsent: {
    termsAccepted: false,
    privacyAccepted: false,
  },

  // Stored moves
  storedMoves: [],
}

const MoveSearchContext = createContext<MoveSearchState & MoveSearchActions>({
  ...defaultState,
  setPickupLocation: () => {},
  setDropoffLocation: () => {},
  setPickupCoordinates: () => {},
  setDropoffCoordinates: () => {},
  setMoveDate: () => {},
  setMoveType: () => {},
  setIsInstantMove: () => {},
  setHomeType: () => {},
  setFloorLevel: () => {},
  setElevatorAvailable: () => {},
  setParkingSituation: () => {},

  setPickupStreetAddress: () => {},
  setPickupApartmentUnit: () => {},
  setPickupAccessNotes: () => {},
  setPickupLoadingZoneRequired: () => {},
  setPickupArrangeHaltverbot: () => {},

  setDropoffStreetAddress: () => {},
  setDropoffApartmentUnit: () => {},
  setDropoffFloorLevel: () => {},
  setDropoffElevatorAvailable: () => {},
  setDropoffParkingSituation: () => {},
  setDropoffArrangeHaltverbot: () => {},

  setInventoryItem: () => {},
  addCustomItem: () => {},
  removeCustomItem: () => {},
  updateCustomItem: () => {},

  // Step 5
  setPackingServiceLevel: () => {},
  togglePackingMaterial: () => {},
  addCustomMaterial: () => {},
  removeCustomMaterial: () => {},
  setPackingBoxQuantity: () => {},
  setPackingNotes: () => {},

  // Step 6
  setArrivalWindow: () => {},
  setFlexibility: () => {},
  setPreferEarliestArrival: () => {},
  setAvoidLunchBreak: () => {},
  setAvoidEveningDelivery: () => {},

  // Step 7
  setCrewSize: () => {},
  setVehicleType: () => {},
  setTruckAccess: () => {},
  toggleHeavyItem: () => {},
  updateHeavyItemDimensions: () => {},
  addCustomHeavyItem: () => {},
  removeCustomHeavyItem: () => {},

  // Step 8
  toggleAdditionalService: () => {},
  setStorageWeeks: () => {},
  setDisposalItems: () => {},
  setCoverPhoto: () => {},
  addGalleryPhoto: () => {},
  removeGalleryPhoto: () => {},

  // Step 9
  updateContactInfo: () => {},

  // Step 10
  setTermsAccepted: () => {},
  setPrivacyAccepted: () => {},

  // Stored moves
  addStoredMove: () => {},
  updateMoveStatus: () => {},
  getMoveByHandle: () => undefined,
  getFilteredMoves: () => [],

  reset: () => {},
})

export const MoveSearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [pickupLocation, setPickupLocation] = useState<string>(defaultState.pickupLocation)
  const [dropoffLocation, setDropoffLocation] = useState<string>(defaultState.dropoffLocation)
  const [pickupCoordinates, setPickupCoordinates] = useState<Coordinates | null>(defaultState.pickupCoordinates)
  const [dropoffCoordinates, setDropoffCoordinates] = useState<Coordinates | null>(defaultState.dropoffCoordinates)
  const [moveDate, setMoveDate] = useState<string | null>(defaultState.moveDate)
  const [moveType, setMoveType] = useState<MoveTypeKey | null>(defaultState.moveType)
  const [isInstantMove, setIsInstantMove] = useState<boolean>(defaultState.isInstantMove)

  const [homeType, setHomeType] = useState<HomeTypeKey | null>(defaultState.homeType)
  const [floorLevel, setFloorLevel] = useState<FloorLevelKey | null>(defaultState.floorLevel)
  const [elevatorAvailable, setElevatorAvailable] = useState<boolean>(defaultState.elevatorAvailable)
  const [parkingSituation, setParkingSituation] = useState<ParkingKey | null>(defaultState.parkingSituation)

  // Step 2 state
  const [pickupStreetAddress, setPickupStreetAddress] = useState<string>(defaultState.pickupStreetAddress)
  const [pickupApartmentUnit, setPickupApartmentUnit] = useState<string>(defaultState.pickupApartmentUnit)
  const [pickupAccessNotes, setPickupAccessNotes] = useState<string>(defaultState.pickupAccessNotes)
  const [pickupLoadingZoneRequired, setPickupLoadingZoneRequired] = useState<boolean>(defaultState.pickupLoadingZoneRequired)
  const [pickupArrangeHaltverbot, setPickupArrangeHaltverbot] = useState<boolean>(defaultState.pickupArrangeHaltverbot)

  // Step 3 state
  const [dropoffStreetAddress, setDropoffStreetAddress] = useState<string>(defaultState.dropoffStreetAddress)
  const [dropoffApartmentUnit, setDropoffApartmentUnit] = useState<string>(defaultState.dropoffApartmentUnit)
  const [dropoffFloorLevel, setDropoffFloorLevel] = useState<FloorLevelKey | null>(defaultState.dropoffFloorLevel)
  const [dropoffElevatorAvailable, setDropoffElevatorAvailable] = useState<boolean>(defaultState.dropoffElevatorAvailable)
  const [dropoffParkingSituation, setDropoffParkingSituation] = useState<DropoffParkingKey | null>(defaultState.dropoffParkingSituation)
  const [dropoffArrangeHaltverbot, setDropoffArrangeHaltverbot] = useState<boolean>(defaultState.dropoffArrangeHaltverbot)

  // Step 4 state
  const [inventory, setInventory] = useState<Record<string, number>>(defaultState.inventory)
  const [customItems, setCustomItems] = useState<CustomItem[]>(defaultState.customItems)

  // Step 5 state
  const [packingServiceLevel, setPackingServiceLevel] = useState<PackingServiceLevel | null>(defaultState.packingServiceLevel)
  const [packingMaterials, setPackingMaterials] = useState<PackingMaterial[]>(defaultState.packingMaterials)
  const [customMaterials, setCustomMaterials] = useState<CustomMaterial[]>(defaultState.customMaterials)
  const [packingBoxQuantities, setPackingBoxQuantities] = useState<Record<string, number>>(defaultState.packingBoxQuantities)
  const [packingNotes, setPackingNotes] = useState<string>(defaultState.packingNotes)

  // Step 6 state
  const [arrivalWindow, setArrivalWindow] = useState<ArrivalWindow | null>(defaultState.arrivalWindow)
  const [flexibility, setFlexibility] = useState<FlexibilityOption | null>(defaultState.flexibility)
  const [preferEarliestArrival, setPreferEarliestArrival] = useState<boolean>(defaultState.preferEarliestArrival)
  const [avoidLunchBreak, setAvoidLunchBreak] = useState<boolean>(defaultState.avoidLunchBreak)
  const [avoidEveningDelivery, setAvoidEveningDelivery] = useState<boolean>(defaultState.avoidEveningDelivery)

  // Step 7 state
  const [crewSize, setCrewSize] = useState<CrewSize | null>(defaultState.crewSize)
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(defaultState.vehicleType)
  const [truckAccess, setTruckAccess] = useState<TruckAccess | null>(defaultState.truckAccess)
  const [heavyItems, setHeavyItems] = useState<HeavyItem[]>(defaultState.heavyItems)
  const [customHeavyItems, setCustomHeavyItems] = useState<HeavyItem[]>(defaultState.customHeavyItems)

  // Step 8 state
  const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>(defaultState.additionalServices)
  const [storageWeeks, setStorageWeeks] = useState<number>(defaultState.storageWeeks)
  const [disposalItems, setDisposalItems] = useState<string>(defaultState.disposalItems)
  const [coverPhoto, setCoverPhoto] = useState<string | null>(defaultState.coverPhoto)
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>(defaultState.galleryPhotos)

  // Step 9 state
  const [contactInfo, setContactInfo] = useState<ContactInfo>(defaultState.contactInfo)

  // Step 10 state
  const [legalConsent, setLegalConsent] = useState<LegalConsent>(defaultState.legalConsent)

  // Stored moves state
  const [storedMoves, setStoredMoves] = useState<StoredMove[]>(defaultState.storedMoves)

  // ─── Restore saved state from sessionStorage after auth redirect ───
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('picklt_move_state')
      if (!raw) return
      const saved = JSON.parse(raw) as Record<string, unknown>

      // Restore all saved fields
      if (saved.pickupLocation) setPickupLocation(saved.pickupLocation as string)
      if (saved.dropoffLocation) setDropoffLocation(saved.dropoffLocation as string)
      if (saved.pickupCoordinates) setPickupCoordinates(saved.pickupCoordinates as Coordinates)
      if (saved.dropoffCoordinates) setDropoffCoordinates(saved.dropoffCoordinates as Coordinates)
      if (saved.moveDate) setMoveDate(saved.moveDate as string)
      if (saved.moveType) setMoveType(saved.moveType as MoveTypeKey)
      if (saved.isInstantMove != null) setIsInstantMove(saved.isInstantMove as boolean)
      if (saved.homeType) setHomeType(saved.homeType as HomeTypeKey)
      if (saved.floorLevel) setFloorLevel(saved.floorLevel as FloorLevelKey)
      if (saved.elevatorAvailable != null) setElevatorAvailable(saved.elevatorAvailable as boolean)
      if (saved.parkingSituation) setParkingSituation(saved.parkingSituation as ParkingKey)
      if (saved.pickupStreetAddress) setPickupStreetAddress(saved.pickupStreetAddress as string)
      if (saved.pickupApartmentUnit) setPickupApartmentUnit(saved.pickupApartmentUnit as string)
      if (saved.dropoffStreetAddress) setDropoffStreetAddress(saved.dropoffStreetAddress as string)
      if (saved.dropoffApartmentUnit) setDropoffApartmentUnit(saved.dropoffApartmentUnit as string)
      if (saved.dropoffFloorLevel) setDropoffFloorLevel(saved.dropoffFloorLevel as FloorLevelKey)
      if (saved.dropoffElevatorAvailable != null) setDropoffElevatorAvailable(saved.dropoffElevatorAvailable as boolean)
      if (saved.dropoffParkingSituation) setDropoffParkingSituation(saved.dropoffParkingSituation as DropoffParkingKey)
      if (saved.inventory) setInventory(saved.inventory as Record<string, number>)
      if (saved.customItems) setCustomItems(saved.customItems as CustomItem[])
      if (saved.packingServiceLevel) setPackingServiceLevel(saved.packingServiceLevel as PackingServiceLevel)
      if (saved.packingMaterials) setPackingMaterials(saved.packingMaterials as PackingMaterial[])
      if (saved.arrivalWindow) setArrivalWindow(saved.arrivalWindow as ArrivalWindow)
      if (saved.crewSize) setCrewSize(saved.crewSize as CrewSize)
      if (saved.vehicleType) setVehicleType(saved.vehicleType as VehicleType)
      if (saved.additionalServices) setAdditionalServices(saved.additionalServices as AdditionalService[])
      if (saved.storageWeeks != null) setStorageWeeks(saved.storageWeeks as number)
      if (saved.coverPhoto) setCoverPhoto(saved.coverPhoto as string)
      if (saved.galleryPhotos) setGalleryPhotos(saved.galleryPhotos as string[])
      if (saved.contactInfo) setContactInfo(saved.contactInfo as ContactInfo)

      // Clear saved state after restore
      sessionStorage.removeItem('picklt_move_state')
      sessionStorage.removeItem('picklt_auth_redirect')
    } catch {
      // Ignore errors during restore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setInventoryItem = (itemId: string, quantity: number) => {
    setInventory((prev) => ({ ...prev, [itemId]: quantity }))
  }

  const addCustomItem = (item: CustomItem) => {
    setCustomItems((prev) => [...prev, item])
  }

  const removeCustomItem = (itemId: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const updateCustomItem = (itemId: string, updates: Partial<CustomItem>) => {
    setCustomItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    )
  }

  // Step 5 actions
  const togglePackingMaterial = (material: PackingMaterial) => {
    setPackingMaterials((prev) =>
      prev.includes(material) ? prev.filter((m) => m !== material) : [...prev, material]
    )
  }

  const addCustomMaterial = (material: CustomMaterial) => {
    setCustomMaterials((prev) => [...prev, material])
  }

  const removeCustomMaterial = (id: string) => {
    setCustomMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  const setPackingBoxQuantity = (boxType: string, quantity: number) => {
    setPackingBoxQuantities((prev) => ({ ...prev, [boxType]: quantity }))
  }

  // Step 7 actions
  const toggleHeavyItem = (itemId: string) => {
    setHeavyItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const updateHeavyItemDimensions = (itemId: string, dimensions: Partial<HeavyItem>) => {
    setHeavyItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, ...dimensions } : item
      )
    )
  }

  const addCustomHeavyItem = (item: HeavyItem) => {
    setCustomHeavyItems((prev) => [...prev, item])
  }

  const removeCustomHeavyItem = (itemId: string) => {
    setCustomHeavyItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  // Step 8 actions
  const toggleAdditionalService = (service: AdditionalService) => {
    setAdditionalServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    )
  }

  const addGalleryPhoto = (photo: string) => {
    setGalleryPhotos((prev) => [...prev, photo])
  }

  const removeGalleryPhoto = (index: number) => {
    setGalleryPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  // Step 9 actions
  const updateContactInfo = (info: Partial<ContactInfo>) => {
    setContactInfo((prev) => ({ ...prev, ...info }))
  }

  // Step 10 actions
  const setTermsAccepted = (accepted: boolean) => {
    setLegalConsent((prev) => ({ ...prev, termsAccepted: accepted }))
  }

  const setPrivacyAccepted = (accepted: boolean) => {
    setLegalConsent((prev) => ({ ...prev, privacyAccepted: accepted }))
  }

  // Stored moves actions
  const addStoredMove = (move: StoredMove) => {
    setStoredMoves((prev) => [...prev, move])
  }

  const updateMoveStatus = (moveId: string, status: MoveStatus) => {
    setStoredMoves((prev) =>
      prev.map((move) => (move.id === moveId ? { ...move, status } : move))
    )
  }

  const getMoveByHandle = (handle: string): StoredMove | undefined => {
    return storedMoves.find((move) => move.handle === handle)
  }

  const getFilteredMoves = (status?: MoveStatus): StoredMove[] => {
    if (!status) return storedMoves
    return storedMoves.filter((move) => move.status === status)
  }

  const reset = () => {
    setPickupLocation(defaultState.pickupLocation)
    setMoveDate(defaultState.moveDate)
    setMoveType(defaultState.moveType)
    setHomeType(defaultState.homeType)
    setFloorLevel(defaultState.floorLevel)
    setElevatorAvailable(defaultState.elevatorAvailable)
    setParkingSituation(defaultState.parkingSituation)
    setPickupStreetAddress(defaultState.pickupStreetAddress)
    setPickupApartmentUnit(defaultState.pickupApartmentUnit)
    setPickupAccessNotes(defaultState.pickupAccessNotes)
    setPickupLoadingZoneRequired(defaultState.pickupLoadingZoneRequired)
    setPickupArrangeHaltverbot(defaultState.pickupArrangeHaltverbot)
    setDropoffStreetAddress(defaultState.dropoffStreetAddress)
    setDropoffApartmentUnit(defaultState.dropoffApartmentUnit)
    setDropoffFloorLevel(defaultState.dropoffFloorLevel)
    setDropoffElevatorAvailable(defaultState.dropoffElevatorAvailable)
    setDropoffParkingSituation(defaultState.dropoffParkingSituation)
    setDropoffArrangeHaltverbot(defaultState.dropoffArrangeHaltverbot)
    setInventory(defaultState.inventory)
    setCustomItems(defaultState.customItems)
    setPackingServiceLevel(defaultState.packingServiceLevel)
    setPackingMaterials(defaultState.packingMaterials)
    setCustomMaterials(defaultState.customMaterials)
    setPackingBoxQuantities(defaultState.packingBoxQuantities)
    setPackingNotes(defaultState.packingNotes)
    // Step 6
    setArrivalWindow(defaultState.arrivalWindow)
    setFlexibility(defaultState.flexibility)
    setPreferEarliestArrival(defaultState.preferEarliestArrival)
    setAvoidLunchBreak(defaultState.avoidLunchBreak)
    setAvoidEveningDelivery(defaultState.avoidEveningDelivery)
    // Step 7
    setCrewSize(defaultState.crewSize)
    setVehicleType(defaultState.vehicleType)
    setTruckAccess(defaultState.truckAccess)
    setHeavyItems(defaultState.heavyItems)
    setCustomHeavyItems(defaultState.customHeavyItems)
    // Step 8
    setAdditionalServices(defaultState.additionalServices)
    setStorageWeeks(defaultState.storageWeeks)
    setDisposalItems(defaultState.disposalItems)
    setCoverPhoto(defaultState.coverPhoto)
    setGalleryPhotos(defaultState.galleryPhotos)
    // Step 9
    setContactInfo(defaultState.contactInfo)
    // Step 10
    setLegalConsent(defaultState.legalConsent)
  }

  return (
    <MoveSearchContext.Provider
      value={{
        pickupLocation,
        dropoffLocation,
        pickupCoordinates,
        dropoffCoordinates,
        moveDate,
        moveType,
        isInstantMove,
        homeType,
        floorLevel,
        elevatorAvailable,
        parkingSituation,

        pickupStreetAddress,
        pickupApartmentUnit,
        pickupAccessNotes,
        pickupLoadingZoneRequired,
        pickupArrangeHaltverbot,

        dropoffStreetAddress,
        dropoffApartmentUnit,
        dropoffFloorLevel,
        dropoffElevatorAvailable,
        dropoffParkingSituation,
        dropoffArrangeHaltverbot,

        inventory,
        customItems,

        packingServiceLevel,
        packingMaterials,
        customMaterials,
        packingBoxQuantities,
        packingNotes,

        // Step 6 state
        arrivalWindow,
        flexibility,
        preferEarliestArrival,
        avoidLunchBreak,
        avoidEveningDelivery,

        // Step 7 state
        crewSize,
        vehicleType,
        truckAccess,
        heavyItems,
        customHeavyItems,

        // Step 8 state
        additionalServices,
        storageWeeks,
        disposalItems,
        coverPhoto,
        galleryPhotos,

        // Step 9 state
        contactInfo,

        // Step 10 state
        legalConsent,

        // Stored moves
        storedMoves,

        setPickupLocation,
        setDropoffLocation,
        setPickupCoordinates,
        setDropoffCoordinates,
        setMoveDate,
        setMoveType,
        setIsInstantMove,
        setHomeType,
        setFloorLevel,
        setElevatorAvailable,
        setParkingSituation,

        setPickupStreetAddress,
        setPickupApartmentUnit,
        setPickupAccessNotes,
        setPickupLoadingZoneRequired,
        setPickupArrangeHaltverbot,

        setDropoffStreetAddress,
        setDropoffApartmentUnit,
        setDropoffFloorLevel,
        setDropoffElevatorAvailable,
        setDropoffParkingSituation,
        setDropoffArrangeHaltverbot,

        setInventoryItem,
        addCustomItem,
        removeCustomItem,
        updateCustomItem,

        setPackingServiceLevel,
        togglePackingMaterial,
        addCustomMaterial,
        removeCustomMaterial,
        setPackingBoxQuantity,
        setPackingNotes,

        // Step 6 actions
        setArrivalWindow,
        setFlexibility,
        setPreferEarliestArrival,
        setAvoidLunchBreak,
        setAvoidEveningDelivery,

        // Step 7 actions
        setCrewSize,
        setVehicleType,
        setTruckAccess,
        toggleHeavyItem,
        updateHeavyItemDimensions,
        addCustomHeavyItem,
        removeCustomHeavyItem,

        // Step 8 actions
        toggleAdditionalService,
        setStorageWeeks,
        setDisposalItems,
        setCoverPhoto,
        addGalleryPhoto,
        removeGalleryPhoto,

        // Step 9 actions
        updateContactInfo,

        // Step 10 actions
        setTermsAccepted,
        setPrivacyAccepted,

        // Stored moves actions
        addStoredMove,
        updateMoveStatus,
        getMoveByHandle,
        getFilteredMoves,

        reset,
      }}
    >
      {children}
    </MoveSearchContext.Provider>
  )
}

export const useMoveSearch = () => useContext(MoveSearchContext)

export default MoveSearchProvider
