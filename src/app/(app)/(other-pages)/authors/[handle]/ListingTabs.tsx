'use client'

import CarCard from '@/components/CarCard'
import ExperiencesCard from '@/components/ExperiencesCard'
import PropertyCard from '@/components/PropertyCard'
import StayCard from '@/components/StayCard'
import {
  getCarListings,
  getExperienceListings,
  getRealEstateListings,
  getStayListings,
  TCarListing,
  TExperienceListing,
  TRealEstateListing,
  TStayListing,
} from '@/data/listings'
import { Tab, TabGroup, TabList } from '@headlessui/react'
import { useEffect, useState } from 'react'

const tabs = ['Stays', 'Experiences', 'Real Estate', 'Car Rentals'] as const

interface Props {
  onChangeTab?: (item: string) => void
}

const ListingTabs = ({ onChangeTab }: Props) => {
  const [stayListings, setStayListings] = useState<TStayListing[]>([])
  const [carListings, setCarListings] = useState<TCarListing[]>([])
  const [experienceListings, setExperienceListings] = useState<TExperienceListing[]>([])
  const [realEstateListings, setRealEstateListings] = useState<TRealEstateListing[]>([])
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>(tabs[0])

  useEffect(() => {
    const fetchListings = async () => {
      if (activeTab === 'Stays' && !stayListings.length) {
        const stays = await getStayListings()
        setStayListings(stays)
      } else if (activeTab === 'Car Rentals' && !carListings.length) {
        const cars = await getCarListings()
        setCarListings(cars)
      } else if (activeTab === 'Experiences' && !experienceListings.length) {
        const experiences = await getExperienceListings()
        setExperienceListings(experiences)
      } else if (activeTab === 'Real Estate' && !realEstateListings.length) {
        const realEstates = await getRealEstateListings()
        setRealEstateListings(realEstates)
      }
    }

    fetchListings()
  }, [activeTab, stayListings.length, carListings.length, experienceListings.length, realEstateListings.length])

  const handleTabChange = async (index: number) => {
    onChangeTab && onChangeTab(tabs[index])
    setActiveTab(tabs[index])
  }

  return (
    <div className="w-full">
      <TabGroup
        onChange={handleTabChange}
        className="hidden-scrollbar relative flex w-full overflow-x-auto text-sm md:text-base"
      >
        <TabList className="flex sm:gap-x-1.5">
          {tabs.map((item, index) => (
            <Tab
              key={index}
              className="block rounded-full px-4 py-2.5 leading-none font-medium whitespace-nowrap focus-within:outline-hidden data-hover:bg-black/5 data-selected:bg-neutral-900 data-selected:text-white sm:px-6 sm:py-3 dark:data-selected:bg-neutral-100 dark:data-selected:text-neutral-900"
            >
              {item}
            </Tab>
          ))}
        </TabList>
      </TabGroup>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-7">
        {activeTab === 'Stays' && stayListings.slice(0, 4).map((stay) => <StayCard key={stay.id} data={stay} />)}

        {activeTab === 'Car Rentals' && carListings.slice(0, 4).map((car) => <CarCard key={car.id} data={car} />)}

        {activeTab === 'Experiences' &&
          experienceListings.slice(0, 4).map((experience) => <ExperiencesCard key={experience.id} data={experience} />)}

        {activeTab === 'Real Estate' &&
          realEstateListings.slice(0, 4).map((realEstate) => <PropertyCard key={realEstate.id} data={realEstate} />)}
      </div>
    </div>
  )
}

export default ListingTabs
