import { useEffect, useRef } from 'react'

export function useInfiniteScrollSentinel<
  TElement extends Element = HTMLDivElement,
>(onLoadMore: () => void, hasNextPage: boolean, isFetchingNextPage: boolean) {
  const sentinelRef = useRef<TElement | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) onLoadMore()
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  return sentinelRef
}
