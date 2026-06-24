import heroimage from '../../../public/AU090348_medium.jpg'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function Hero() {
  const heroImageRef = useRef<HTMLDivElement | null>(null)

  useGSAP(() => {
    gsap.from(heroImageRef.current, {
      scale: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: heroImageRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    })
  }, [heroImageRef])

  return (
    <section className="min-h-[300svh] w-full relative bg-cover bg-center">
      <div className="w-full sticky top-0">
        <div
          ref={heroImageRef}
          className="min-h-screen w-full scale-45 bg-no-repeat bg-auto bg-position-[calc(50%+8vw)_center] bg-black grid grid-cols-2 grid-rows-2 z-40 relative"
          style={{
            backgroundImage: `url(${heroimage})`,
            backgroundSize: 'cover',
            padding: '2rem',
          }}
        >
          <div className="text-white col-span-1 row-span-1 row-start-2 self-end w-full">
            <h4 className="text-md text-white/80">AUDI SPORT</h4>
            <h1
              className="max-w-[12ch] text-7xl"
              style={{ paddingBottom: '2.5rem', paddingTop: '1rem' }}
            >
              A LEGACY FORGED IN COMPETITION.
            </h1>
            <div className="text-sm text-white/80 leading-8">
              <p>1980 - PRESENT</p>
              <p>Rally. Touring Cars.</p>
              <p>Le Mans. Dakar.</p>
            </div>
          </div>

          <div className="col-span-1 row-span-1 row-start-2 col-start-2 text-white self-end justify-self-end flex flex-col items-center">
            <p className="text-xs uppercase tracking-widest">SCROLL</p>
            <div className="h-3" />
            <div className="w-px h-15 bg-white" />

            <div className="h-6" />

            <div className="flex flex-col items-center">
              <div className="w-px h-10 bg-white" />
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-white" />
            </div>
          </div>
        </div>

        <section className="absolute inset-0 w-full min-h-screen text-black/5 z-0 grid grid-cols-20 grid-rows-3">
                  <h1 className='col-span-2 row-span-1 row-start-2 col-start-2 self-center justify-self-start text-[180px]'>1980</h1>
                  <h1 className='col-span-2 row-span-1 row-start-2 col-start-15 self-center text-[180px]'>2025</h1>
                  <div className='col-span-20 row-span-1 row-start-3 self-center justify-self-center text-xl text-black'>
                      <h1 className='text-center'>40+ YEARS OF MOTORSPORT</h1>
                      <ul className='flex flex-row gap-4 text-black text-7xl'>
                        <li>500+</li>
                        <li>13</li>
                        <li>4</li>
                        <li>7</li>
                        <li>100+</li>
                      </ul>
                  </div>
        </section>
      </div>
    </section>
  )
}
