import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

const CIRCLES = ['c1', 'c2', 'c3', 'c4']

export default function PageLoader() {
  const circlesRef = useRef<(SVGCircleElement | null)[]>([])
  const loaderRef = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useGSAP(() => {
    const timeline = gsap.timeline()

    circlesRef.current.forEach((circle, index) => {
      if (!circle) return

      const circumference = 2 * Math.PI * 45
      circle.style.strokeDasharray = `${circumference}`
      circle.style.strokeDashoffset = `${circumference}`

      timeline.to(
        circle,
        {
          strokeDashoffset: 0,
          duration: 1.5,
          ease: 'power1.inOut',
        },
        index * 0.5,
      )
    })

    timeline.to(
      loaderRef.current,
      {
        scale: 100,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.inOut',
      },
      '+=0.2',
    )

    const hideTimer = window.setTimeout(
      () => setIsLoading(false),
      timeline.duration() * 1000,
    )

    return () => window.clearTimeout(hideTimer)
  }, [])

  if (!isLoading) return null

  return (
    <div
      ref={loaderRef}
      className="page-loader fixed left-0 top-0 z-50 h-[100lvh] w-full origin-center overflow-hidden bg-black"
      data-header-theme="dark"
    >
      <div className="absolute left-1/2 top-[50svh] -translate-x-1/2 -translate-y-1/2">
        <svg width="280" height="100" viewBox="0 0 280 100">
          {CIRCLES.map((circle, index) => (
            <circle
              key={circle}
              ref={(element) => {
                circlesRef.current[index] = element
              }}
              cx={50 + index * 60}
              cy="50"
              r="45"
              fill="none"
              stroke="white"
              strokeWidth="8"
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
