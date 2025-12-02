import { RefObject, useEffect } from 'react'

type HandledEvents = MouseEvent | TouchEvent | KeyboardEvent
type Handler = (event: HandledEvents) => void

/**
 * Một custom hook của React để xử lý các tương tác (click, touch, phím Escape)
 * xảy ra bên ngoài một hoặc nhiều phần tử tham chiếu (ref).
 *
 * Hook này chấp nhận một hoặc một mảng các RefObject trỏ tới các HTMLElement.
 *
 * @param {RefObject<HTMLElement> | RefObject<HTMLElement>[]} refs - Một ref hoặc một mảng các ref đến các phần tử cần theo dõi.
 * @param {Handler} handler - Hàm callback sẽ được gọi khi có tương tác bên ngoài.
 */
export function useInteractOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  handler: Handler
): void {
  useEffect(() => {
    const eventTypes: Array<keyof DocumentEventMap> = ['mousedown', 'touchstart', 'keydown']

    const listener = (event: Event) => {
      const e = event as HandledEvents

      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        handler(e)
        return
      }

      const refsArray = Array.isArray(refs) ? refs : [refs]
      const target = e.target as Node

      const isInside = refsArray.some((ref) => {
        // `ref.current` có thể là null, kiểm tra trước khi dùng `.contains()`
        return ref.current && ref.current.contains(target)
      })

      if (e instanceof MouseEvent || e instanceof TouchEvent) {
        if (!isInside) {
          handler(e)
        }
      }
    }

    eventTypes.forEach((type) => {
      document.addEventListener(type, listener)
    })

    return () => {
      eventTypes.forEach((type) => {
        document.removeEventListener(type, listener)
      })
    }
  }, [refs, handler])
}
