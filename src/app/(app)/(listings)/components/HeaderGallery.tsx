'use client'

import { Button } from '@/shared/Button'
import ButtonClose from '@/shared/ButtonClose'
import T from '@/utils/getT'
import { CloseButton, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { Squares2X2Icon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import useEmblaCarousel from 'embla-carousel-react'

import { ThemeContext } from '@/app/theme-provider'
import { EmblaOptionsType } from 'embla-carousel'
import Image from 'next/image'
import { useCallback, useContext, useEffect, useState } from 'react'

const EmblaCarousel = ({ images, option }: { images: string[]; option: EmblaOptionsType }) => {
  const theme = useContext(ThemeContext)

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({
    ...option,
    direction: theme?.themeDir,
  })
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    ...option,
    containScroll: 'keepSnaps',
    dragFree: true,
    direction: theme?.themeDir,
  })

  const onThumbClick = useCallback(
    (index: number) => {
      if (!emblaMainApi || !emblaThumbsApi) return
      emblaMainApi.scrollTo(index)
    },
    [emblaMainApi, emblaThumbsApi]
  )

  const onSelect = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return
    setSelectedIndex(emblaMainApi.selectedScrollSnap())
    emblaThumbsApi.scrollTo(emblaMainApi.selectedScrollSnap())
  }, [emblaMainApi, emblaThumbsApi, setSelectedIndex])

  useEffect(() => {
    if (!emblaMainApi) return
    onSelect()

    emblaMainApi.on('select', onSelect).on('reInit', onSelect)
  }, [emblaMainApi, onSelect])

  return (
    <div className="relative size-full embla">
      <div className="embla__viewport relative mx-auto size-full overflow-hidden" ref={emblaMainRef}>
        <div className="embla__container size-full">
          {images.map((image, index) => (
            <div className="relative z-50 flex embla__slide basis-full items-center justify-center" key={index}>
              <Image
                alt="Slide image"
                src={image}
                width={1280}
                height={853}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute top-2.5 right-2.5 z-50 sm:top-4 sm:right-4">
            <CloseButton as={ButtonClose}>
              <span className="sr-only">Close</span>
            </CloseButton>
          </div>
        </div>
      </div>

      <div className="embla-thumbs fixed inset-x-0 bottom-5 z-10">
        <div className="embla-thumbs__viewport mx-auto max-w-28" ref={emblaThumbsRef}>
          <div className="embla-thumbs__container flex">
            {images.map((image, index) => (
              <div
                key={index}
                className={clsx(
                  'relative flex aspect-5/3 w-24 shrink-0 items-center justify-center transition-[transform,filter] duration-300 ease-in-out',
                  index === selectedIndex
                    ? 'z-10 scale-125 overflow-hidden rounded-md brightness-100'
                    : 'brightness-50 hover:brightness-75'
                )}
                onClick={() => onThumbClick(index)}
              >
                <Image alt="Slide image" src={image} fill sizes="100px" className={'object-cover'} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props {
  images: string[]
  gridType?: 'grid1' | 'grid2' | 'grid3' | 'grid4'
}
const HeaderGallery = ({ images, gridType = 'grid1' }: Props) => {
  let [isOpen, setIsOpen] = useState(false)
  let [startIndex, setStartIndex] = useState(0)

  const handleOpenDialog = (index = 0) => {
    setStartIndex(index)
    setIsOpen(true)
  }

  return (
    <>
      {gridType === 'grid1' && <HeaderGalleryGrid1 images={images} handleOpenDialog={handleOpenDialog} />}
      {gridType === 'grid2' && <HeaderGalleryGrid2 images={images} handleOpenDialog={handleOpenDialog} />}
      {gridType === 'grid3' && <HeaderGalleryGrid3 images={images} handleOpenDialog={handleOpenDialog} />}
      {gridType === 'grid4' && <HeaderGalleryGrid4 images={images} handleOpenDialog={handleOpenDialog} />}

      {/* Dialog for full-screen image gallery */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        {/* The backdrop, rendered as a fixed sibling to the panel container */}
        <DialogBackdrop className="fixed inset-0 bg-black" />

        {/* Full-screen container to center the panel */}
        <div className="fixed inset-0 flex w-screen items-center justify-center">
          <DialogPanel
            transition
            className="relative mx-auto aspect-[3/2] max-h-full w-full max-w-7xl flex-1 transition data-closed:opacity-0"
          >
            <EmblaCarousel images={images} option={{ startIndex, slidesToScroll: 1 }} />
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

const HeaderGalleryGrid1 = ({
  images,
  handleOpenDialog,
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
}) => {
  return (
    <header className="relative md:grid md:grid-cols-4 md:gap-2">
      <div className="relative aspect-4/5 size-full md:col-span-2 md:aspect-4/4" onClick={() => handleOpenDialog(0)}>
        {images[0] && (
          <Image
            fill
            className="rounded-xl object-cover transition-[filter] hover:brightness-75"
            src={images[0]}
            alt="bigger"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
            priority
          />
        )}
      </div>
      <div className="hidden md:col-span-2 md:grid md:grid-cols-2 md:gap-2">
        {images.slice(1, 5).map((item, index) => (
          <div className="relative aspect-2/2 size-full" key={index} onClick={() => handleOpenDialog(index + 1)}>
            <Image
              fill
              className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
              src={item || ''}
              alt="others"
              sizes="(max-width: 768px) 33vw, 33vw"
              priority
            />
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 left-3">
        <Button color="light" onClick={() => handleOpenDialog()}>
          <Squares2X2Icon className="h-5 w-5" />
          <span>{T['common']['Show all photos']}</span>
        </Button>
      </div>
    </header>
  )
}
const HeaderGalleryGrid2 = ({
  images,
  handleOpenDialog,
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
}) => {
  return (
    <header className="relative md:grid md:grid-cols-4">
      <div className="relative aspect-4/5 size-full md:col-span-3 md:aspect-5/4" onClick={() => handleOpenDialog(0)}>
        {images[0] && (
          <Image
            alt=""
            src={images[0]}
            fill
            className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
            priority
          />
        )}
      </div>

      <div className="hidden md:grid md:grid-cols-1 md:gap-y-2 md:ps-2">
        {images.slice(1, 4).map((item, index) => (
          <div className="relative aspect-3/2 size-full" key={index} onClick={() => handleOpenDialog(index + 1)}>
            <Image
              alt=""
              src={item}
              fill
              className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
              sizes="(max-width: 768px) 33vw, 33vw"
              priority
            />
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 left-3">
        <Button color="light" onClick={() => handleOpenDialog()}>
          <Squares2X2Icon className="h-5 w-5" />
          <span>{T['common']['Show all photos']}</span>
        </Button>
      </div>
    </header>
  )
}
const HeaderGalleryGrid3 = ({
  images,
  handleOpenDialog,
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
}) => {
  return (
    <header className="relative md:grid md:grid-cols-3 md:gap-x-2">
      <div className="relative aspect-4/5 size-full md:aspect-3/4" onClick={() => handleOpenDialog(0)}>
        {images[0] && (
          <Image
            alt=""
            src={images[0]}
            fill
            className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
            priority
          />
        )}
      </div>

      <div className="hidden md:grid md:grid-cols-1 md:gap-y-2">
        <div className="relative aspect-3/2 size-full" onClick={() => handleOpenDialog(1)}>
          {images[1] && (
            <Image
              alt=""
              src={images[1]}
              fill
              className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
              sizes="(max-width: 768px) 33vw, 33vw"
              priority
            />
          )}
        </div>
        <div className="relative aspect-3/2 size-full" onClick={() => handleOpenDialog(2)}>
          {images[2] && (
            <Image
              alt=""
              src={images[2]}
              fill
              className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
              sizes="(max-width: 768px) 33vw, 33vw"
              priority
            />
          )}
        </div>
      </div>

      <div className="relative hidden size-full md:block md:aspect-3/4" onClick={() => handleOpenDialog(3)}>
        {images[3] && (
          <Image
            alt=""
            src={images[3]}
            fill
            className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
            priority
          />
        )}
      </div>

      <div className="absolute bottom-3 left-3">
        <Button color="light" onClick={() => handleOpenDialog()}>
          <Squares2X2Icon className="h-5 w-5" />
          <span>{T['common']['Show all photos']}</span>
        </Button>
      </div>
    </header>
  )
}
const HeaderGalleryGrid4 = ({
  images,
  handleOpenDialog,
}: {
  images: string[]
  handleOpenDialog: (index?: number) => void
}) => {
  return (
    <header className="relative md:grid md:grid-cols-3 md:gap-x-2">
      <div className="relative aspect-4/5 size-full md:aspect-3/4" onClick={() => handleOpenDialog(0)}>
        {images[0] && (
          <Image
            alt=""
            src={images[0]}
            fill
            className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
            priority
          />
        )}
      </div>

      <div className="relative hidden aspect-4/5 size-full md:block md:aspect-3/4" onClick={() => handleOpenDialog(3)}>
        {images[3] && (
          <Image
            alt=""
            src={images[3]}
            fill
            className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 80vw"
            priority
          />
        )}
      </div>

      <div className="hidden md:grid md:grid-cols-1 md:gap-y-2">
        <div className="relative aspect-3/2 size-full" onClick={() => handleOpenDialog(1)}>
          {images[1] && (
            <Image
              alt=""
              src={images[1]}
              fill
              className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
              sizes="(max-width: 768px) 33vw, 33vw"
              priority
            />
          )}
        </div>
        <div className="relative aspect-3/2 size-full" onClick={() => handleOpenDialog(2)}>
          {images[2] && (
            <Image
              alt=""
              src={images[2]}
              fill
              className="rounded-xl object-cover brightness-100 transition-[filter] hover:brightness-75"
              sizes="(max-width: 768px) 33vw, 33vw"
              priority
            />
          )}
        </div>
      </div>

      <div className="absolute bottom-3 left-3">
        <Button color="light" onClick={() => handleOpenDialog()}>
          <Squares2X2Icon className="h-5 w-5" />
          <span>{T['common']['Show all photos']}</span>
        </Button>
      </div>
    </header>
  )
}

export default HeaderGallery
