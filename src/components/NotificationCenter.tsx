import { useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

const formatTimeAgo = (ts: number) => {
  const diff = Math.max(0, Date.now() - ts)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  return `${hr}h ago`
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const notifications = useUIStore((s) => s.notifications)
  const clearNotifications = useUIStore((s) => s.clearNotifications)
  const unreadCount = notifications.length

  const recent = useMemo(() => notifications.slice(0, 8), [notifications])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[320px] max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-900">Notifications</p>
            <button onClick={clearNotifications} className="text-xs text-primary-600 font-semibold">
              Clear all
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-500 text-center">No notifications yet.</p>
            ) : (
              recent.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b last:border-b-0 border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  {n.message && <p className="text-xs text-gray-600 mt-1">{n.message}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">{formatTimeAgo(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
