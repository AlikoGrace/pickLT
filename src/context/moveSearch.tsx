"use client"

import React, { createContext, useContext, useState } from 'react'

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
export type ArrivalWindow = 'morning' | 'midday' | 'afternoon' | 'flexible'
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

type MoveSearchState = {
  pickupLocation: string
  moveDate: string | null // ISO date YYYY-MM-DD
  moveType: MoveTypeKey | null

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
}

type MoveSearchActions = {
  setPickupLocation: (v: string) => void
  setMoveDate: (d: string | null) => void
  setMoveType: (t: MoveTypeKey | null) => void

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

  reset: () => void
}

const defaultState: MoveSearchState = {
  pickupLocation: '',
  moveDate: null,
  moveType: null,
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
}

const MoveSearchContext = createContext<MoveSearchState & MoveSearchActions>({
  ...defaultState,
  setPickupLocation: () => {},
  setMoveDate: () => {},
  setMoveType: () => {},
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

  reset: () => {},
})

export const MoveSearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [pickupLocation, setPickupLocation] = useState<string>(defaultState.pickupLocation)
  const [moveDate, setMoveDate] = useState<string | null>(defaultState.moveDate)
  const [moveType, setMoveType] = useState<MoveTypeKey | null>(defaultState.moveType)

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
        moveDate,
        moveType,
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

        setPickupLocation,
        setMoveDate,
        setMoveType,
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

        reset,
      }}
    >
      {children}
    </MoveSearchContext.Provider>
  )
}

export const useMoveSearch = () => useContext(MoveSearchContext)

export default MoveSearchProvider
