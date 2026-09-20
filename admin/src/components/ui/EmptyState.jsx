import { Inbox } from 'lucide-react'

export default function EmptyState({ message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-center">
      <div className="w-12 h-12 rounded-[12px] bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center text-[var(--ink-soft)]">
        <Inbox className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold text-[var(--ink-soft)] max-w-sm">{message}</p>
      {action}
    </div>
  )
}
