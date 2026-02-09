import { ComputedRef, Ref, computed } from 'vue'

import { CarouselConfig } from '@/shared'
import { DEFAULT_MOUSE_WHEEL_THRESHOLD } from '@/shared/constants'

export type WheelEventData = {
  deltaX: number
  deltaY: number
  isScrollingForward: boolean
}

export type UseWheelOptions = {
  isVertical: boolean | ComputedRef<boolean>
  isSliding: boolean | Ref<boolean>
  config: CarouselConfig
  onWheel?: (data: WheelEventData) => void
}

export function useWheel(options: UseWheelOptions) {
  const { isVertical, isSliding, config } = options

  // Create computed values to handle both reactive and non-reactive inputs
  const vertical = computed(() => {
    return typeof isVertical === 'boolean' ? isVertical : isVertical.value
  })

  const sliding = computed(() => {
    return typeof isSliding === 'boolean' ? isSliding : isSliding.value
  })

  const handleScroll = (event: WheelEvent): void => {
    if (!config.mouseWheel || sliding.value) {
      return
    }

    // Add sensitivity threshold to prevent small movements from triggering navigation
    const threshold =
      typeof config.mouseWheel === 'object'
        ? (config.mouseWheel.threshold ?? DEFAULT_MOUSE_WHEEL_THRESHOLD)
        : DEFAULT_MOUSE_WHEEL_THRESHOLD

    // Determine scroll direction
    const deltaY = Math.abs(event.deltaY) > threshold ? event.deltaY : 0
    const deltaX = Math.abs(event.deltaX) > threshold ? event.deltaX : 0

    // eslint-disable-next-line no-console
    console.log('Z', vertical.value, Math.abs(deltaY), Math.abs(deltaX))

    // preventDefault if scroll by config axis
    if (
      (vertical.value && Math.abs(deltaY) < Math.abs(deltaX)) ||
      (!vertical.value && Math.abs(deltaY) > Math.abs(deltaX))
    ) {
      // eslint-disable-next-line no-console
      console.log('axis.stop', { deltaX, deltaY })
      return
    }

    // eslint-disable-next-line no-console
    console.log('whell.go', { deltaX, deltaY })

    event.preventDefault()

    // If neither delta exceeds the threshold, don't navigate
    if (deltaY === 0 && deltaX === 0) {
      return
    }

    // Determine primary delta based on carousel orientation
    const primaryDelta = vertical.value ? deltaY : deltaX

    // If primaryDelta is 0, use the other delta as fallback
    const effectiveDelta =
      primaryDelta !== 0 ? primaryDelta : vertical.value ? deltaX : deltaY

    // Positive delta means scrolling down/right
    const isScrollingForward = effectiveDelta > 0

    options.onWheel?.({ deltaX, deltaY, isScrollingForward })
  }

  return {
    handleScroll,
  }
}
