import _ from 'lodash'
import { useEffect, useState } from 'react'

export default function useSnapSlider({ sliderRef }: { sliderRef: React.RefObject<HTMLDivElement | null> }) {
  const [isAtEnd, setIsAtEnd] = useState(false)
  const [isAtStart, setIsAtStart] = useState(true)

  const get_slider_item_size = () => {
    const itemWidth = sliderRef.current?.querySelector('.mySnapItem')?.clientWidth || 0

    // check rtl
    return document.dir === 'rtl' ? -itemWidth : itemWidth
  }

  useEffect(() => {
    const slider = sliderRef.current
    if (!slider) {
      return
    }

    const handleScroll = _.debounce(() => {
      const slider = sliderRef.current
      if (!slider) {
        return
      }

      // check if at end or start
      // check RTL
      if (document.dir === 'rtl') {
        setIsAtEnd(-slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 50)
        setIsAtStart(slider.scrollLeft > -50)
      } else {
        setIsAtEnd(slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 50)
        setIsAtStart(slider.scrollLeft < 50)
      }
    }, 600)

    slider.addEventListener('scroll', handleScroll)
    return () => {
      slider.removeEventListener('scroll', handleScroll)
    }
  }, [sliderRef])

  function scrollToNextSlide() {
    sliderRef.current?.scrollBy({
      left: get_slider_item_size(),
      behavior: 'smooth',
    })
  }

  function scrollToPrevSlide() {
    sliderRef.current?.scrollBy({
      left: -get_slider_item_size(),
      behavior: 'smooth',
    })
  }

  return {
    scrollToNextSlide,
    scrollToPrevSlide,
    isAtEnd,
    isAtStart,
  }
}
