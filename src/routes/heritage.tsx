import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/heritage')({
  component: Heritage,
})

function Heritage() {
  return <div>Hello "/heritage"!</div>
}
