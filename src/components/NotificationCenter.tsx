import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

const formatTimeAgo = (ts: number) => {
  const diff = Math.max(0, Date.now() - ts)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  return `${hr}h`
}

const NotificationIcon = ({ variant }: { variant: 'success' | 'error' | 'info' }) => {
  switch (variant) {
    case 'success': return <div className="p-1.5 bg-green-100 dark:bg-green-500/20 rounded-lg text-green-600 dark:text-green-400 shrink-0"><CheckCircle2 size={16} /></div>
    case 'error': return <div className="p-1.5 bg-red-100 dark:bg-red-500/20 rounded-lg text-red-600 dark:text-red-400 shrink-0"><AlertCircle size={16} /></div>
    case 'info': return <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400 shrink-0"><Info size={16} /></div>
    default: return null
  }
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const notifications = useUIStore((s) => s.notifications)
  const clearNotifications = useUIStore((s) => s.clearNotifications)
  const unreadCount = notifications.length

  const recent = useMemo(() => notifications.slice(0, 8), [notifications])

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-5 h-5 px-1 rounded-full bg-primary-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-in zoom-in duration-300">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay for mobile to capture clicks/taps better */}
          <div className="fixed inset-0 z-40 lg:hidden bg-black/5" onClick={() => setOpen(false)} />
          
          <div className="fixed inset-x-4 top-[72px] sm:absolute sm:inset-auto sm:right-0 sm:mt-3 w-auto sm:w-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-black text-gray-900 dark:text-white tracking-tight">Notifications</h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    clearNotifications()
                    setOpen(false)
                  }}
                  className="text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline"
                >
                  Clear all
                </button>
                <button onClick={() => setOpen(false)} className="text-gray-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <div className="max-h-[420px] overflow-y-auto">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-10 py-16 text-center space-y-3">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-full text-slate-300 dark:text-slate-600">
                    <Bell size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">All caught up!</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Check back later for new updates.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recent.map((n) => (
                    <div key={n.id} className="group px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex gap-4">
                        <NotificationIcon variant={n.variant} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate-two-lines">
                              {n.title}
                            </p>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tabular-nums shrink-0 mt-0.5">
                              {formatTimeAgo(n.createdAt)}
                            </span>
                          </div>
                          {n.message && (
                            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed line-clamp-2 italic">
                              {n.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {recent.length > 0 && (
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">Showing recent alerts</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
