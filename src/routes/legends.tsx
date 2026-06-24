import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/legends')({
  component: Legends,
})

function Legends() {
  return <div>Hello "/legends"!</div>
}
