import { useEffect, useRef, useState } from 'react'

export function useInView(options = {}) {
  const { root = null, rootMargin = '200px', threshold = 0.01, once = true } = options
  const ref = useRef(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    if (!ref.current) return undefined
    if (once && isInView) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) {
          setIsInView(true)
          if (once) observer.disconnect()
          return
        }

        if (!once) {
          setIsInView(false)
        }
      },
      { root, rootMargin, threshold }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [root, rootMargin, threshold, once, isInView])

  return { ref, isInView }
}
