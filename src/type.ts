export interface GuestsObject {
  guestAdults?: number
  guestChildren?: number
  guestInfants?: number
}

export type ListingType = 'Stays' | 'Experiences' | 'Cars' | 'Flights' | 'RealEstates'

export interface PropertyType {
  name: string
  description: string
  value: string
}

export interface ClassOfProperties extends PropertyType {}

export type DateRage = [Date | null, Date | null]
