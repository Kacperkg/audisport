import { createFileRoute } from '@tanstack/react-router'
import IndexLoader from '@/components/IndexLoader'
import Hero from '#/components/index/Hero'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14 bg-[#F8F6F2]">
      <IndexLoader />
      <Hero />
      <section className="min-h-[300svh] w-full relative bg-cover bg-center"></section>
    </main>
  )
}
