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

        reset,
      }}
    >
      {children}
    </MoveSearchContext.Provider>
  )
}

export const useMoveSearch = () => useContext(MoveSearchContext)

export default MoveSearchProvider
