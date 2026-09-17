import { Inbox } from 'lucide-react'

export default function EmptyState({ message, action }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <Inbox className="h-8 w-8 text-[#5d5373]" aria-hidden="true" />
      <p className="text-sm text-[#8b80a8]">{message}</p>
      {action}
    </div>
  )
}