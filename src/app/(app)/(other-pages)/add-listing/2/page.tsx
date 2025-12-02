'use client'

import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import T from '@/utils/getT'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { Map, Marker } from '@vis.gl/react-google-maps'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import FormItem from '../FormItem'

const Page = () => {
  const [mapPosition, setMapPosition] = useState({
    lat: 55.9607277,
    lng: 36.2172614,
  })
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/3')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/3')
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">{T['addListings']['page2']['pageTitle']}</h1>
      <Divider className="w-14!" />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        <div>
          <ButtonSecondary>
            <MapPinIcon className="h-5 w-5" />
            <span>{T['addListings']['page2']['Use current location']}</span>
          </ButtonSecondary>
        </div>
        {/* ITEM */}
        <FormItem label={T['addListings']['page2']['Country/Region']}>
          <Select name="country-region">
            <option value="United States">United States</option>
            <option value="Viet Nam">Viet Nam</option>
            <option value="Thailand">Thailand</option>
            <option value="France">France</option>
            <option value="Singapore">Singapore</option>
            <option value="Jappan">Jappan</option>
            <option value="Korea">Korea</option>
            <option value="...">...</option>
          </Select>
        </FormItem>
        <FormItem label={T['addListings']['page2']['Street']}>
          <Input name="Street" placeholder="..." />
        </FormItem>
        <FormItem label={T['addListings']['page2']['Room number (optional)']}>
          <Input name="room-number" type="number" />
        </FormItem>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-5">
          <FormItem label={T['addListings']['page2']['City']}>
            <Input name="city" />
          </FormItem>
          <FormItem label={T['addListings']['page2']['State']}>
            <Input name="state" />
          </FormItem>
          <FormItem label={T['addListings']['page2']['Postal code']}>
            <Input name="Postal" />
          </FormItem>
        </div>
        <div>
          <p>{T['addListings']['page2']['Detailed address']}</p>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            1110 Pennsylvania Avenue NW, Washington, DC 20230
          </span>
          <div className="mt-4">
            <div className="aspect-w-5 aspect-h-7 sm:aspect-h-3">
              <div className="overflow-hidden rounded-xl">
                <Map
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  defaultZoom={15}
                  defaultCenter={{
                    lat: 55.9607277,
                    lng: 36.2172614,
                  }}
                  gestureHandling={'greedy'}
                >
                  <Marker
                    position={mapPosition}
                    draggable
                    onDragEnd={(e) => {
                      setMapPosition({
                        lat: e.latLng?.lat() || 55.9607277,
                        lng: e.latLng?.lng() || 36.2172614,
                      })
                    }}
                  />
                </Map>

                <input type="hidden" name="latMapPosition" value={mapPosition.lat} />
                <input type="hidden" name="lngMapPosition" value={mapPosition.lng} />
              </div>
            </div>
          </div>
        </div>
      </Form>
    </>
  )
}

export default Page
