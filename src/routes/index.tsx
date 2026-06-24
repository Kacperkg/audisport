import { createFileRoute } from '@tanstack/react-router'
import IndexLoader from '@/components/IndexLoader'
import Hero from '#/components/index/Hero'
import Subsection from '#/components/index/Subsection'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="page-wrap bg-[#F8F6F2]" data-header-theme="light">
      <IndexLoader />
      <Hero />
      <Subsection />
      <section className="min-h-[200dvh] bg-amber-50"></section>
    </main>
  )
}
