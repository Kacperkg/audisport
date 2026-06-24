import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export default function IndexLoader() {
  const circlesRef = useRef<(SVGCircleElement | null)[]>([])
  const mainRef = useRef<HTMLElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useGSAP(() => {
    const tl = gsap.timeline()

    circlesRef.current.forEach((circle, index) => {
      if (circle) {
        const circumference = 2 * Math.PI * 45
        circle.style.strokeDasharray = `${circumference}`
        circle.style.strokeDashoffset = `${circumference}`

        tl.to(
          circle,
          {
            strokeDashoffset: 0,
            duration: 1.5,
            ease: 'power1.inOut',
          },
          index * 0.5,
        )
      }
    })

    tl.to(
      mainRef.current,
      {
        scale: 100,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.inOut',
      },
      '+=0.2',
    )

    const hideTimer = setTimeout(() => {
      setIsLoading(false)
    }, tl.duration() * 1000)

    return () => clearTimeout(hideTimer)
  }, [])

  if (!isLoading) {
    return null
  }

  const circles = ['c1', 'c2', 'c3', 'c4']

  return (
    <main
      ref={mainRef}
      className="w-full min-h-screen bg-black fixed z-50 -translate-1/2 left-1/2 top-1/2"
      data-header-theme="dark"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg width="280" height="100" viewBox="0 0 280 100">
          {circles.map((circle, index) => (
            <circle
              key={circle}
              ref={(el) => {
                circlesRef.current[index] = el
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
    </main>
  )
}
