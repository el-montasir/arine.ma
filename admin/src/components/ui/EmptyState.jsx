import { Inbox } from 'lucide-react'

export default function EmptyState({ message, action }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <Inbox className="h-8 w-8 text-text-subtle" aria-hidden="true" />
      <p className="text-sm text-text-muted">{message}</p>
      {action}
    </div>
  )
}