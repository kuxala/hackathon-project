import { useEffect, useState, useRef } from 'react'

interface UseInViewOptions {
  threshold?: number
  triggerOnce?: boolean
}

export function useInView({ threshold = 0.1, triggerOnce = true }: UseInViewOptions = {}) {
  const [isInView, setIsInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          if (triggerOnce && element) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
          setIsInView(false)
        }
      },
      { threshold }
    )

    if (element) {
      observer.observe(element)
    }

    return () => {
      if (element) {
        observer.unobserve(element)
      }
    }
  }, [threshold, triggerOnce])

  return { ref, isInView }
}
