import { createFileRoute } from '@tanstack/react-router'
import IndexLoader from '@/components/IndexLoader'
import Hero from '#/components/index/Hero'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="page-wrap bg-[#F8F6F2]" data-header-theme="light">
      <IndexLoader />
      <Hero />
      <section
        className="min-h-[300svh] w-full relative bg-cover bg-center"
        data-header-theme="light"
      ></section>
    </main>
  )
}
