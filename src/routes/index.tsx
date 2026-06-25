import { createFileRoute } from '@tanstack/react-router'
import IndexLoader from '@/components/IndexLoader'
import Hero from '#/components/index/Hero'
import SectionOne from '#/components/index/SectionOne'
import Subsection from '#/components/index/Subsection'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="page-wrap bg-[#F8F6F2]" data-header-theme="light">
      <IndexLoader />
      <Hero />
      <section className="relative">
        <div className="min-h-[200dvh]">
          <Subsection />
        </div>
        <div
          className="relative z-20 mt-[-75dvh] bg-black"
          data-header-theme="dark"
        >
          <SectionOne />
        </div>
      </section>
    </main>
  )
}
