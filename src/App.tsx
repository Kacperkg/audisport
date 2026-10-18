import { useEffect } from 'react'
import Hero from '@/components/hero/Hero'
import Header from '@/components/layout/Header'
import PageLoader from '@/components/loading/PageLoader'
import PhilosophySection from '@/components/philosophy/PhilosophySection'
import MotorsportStory from '@/components/story/MotorsportStory'

export default function App() {
  useScrollRestoration()

  return (
    <>
      <Header />
      <main
        id="top"
        className="page-wrap bg-[#F8F6F2]"
        data-header-theme="light"
      >
        <PageLoader />
        <Hero />
        <section className="relative">
          <div className="min-h-screen lg:min-h-[250dvh]">
            <PhilosophySection />
          </div>
          <div
            className="relative z-20 bg-black lg:mt-[-75dvh]"
            data-header-theme="dark"
          >
            <MotorsportStory />
          </div>
        </section>
      </main>
    </>
  )
}

function useScrollRestoration() {
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return

    window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    return () => {
      window.history.scrollRestoration = 'auto'
    }
  }, [])
}
