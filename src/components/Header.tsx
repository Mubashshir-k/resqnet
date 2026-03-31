import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Home, ListChecks, LogOut, MapPinned, Menu, ShieldCheck, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useEffect, useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import NotificationCenter from './NotificationCenter'

export default function Header() {
  const { user, logout } = useAuthStore()
  const { darkMode, toggleDarkMode } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard', roles: ['user', 'volunteer', 'admin'], icon: Home },
    { label: 'Report Incident', href: '/report', roles: ['user'], icon: AlertTriangle },
    { label: 'Map View', href: '/map', roles: ['user', 'volunteer', 'admin'], icon: MapPinned },
    { label: 'My Reports', href: '/my-reports', roles: ['user'], icon: ListChecks },
    { label: 'Admin', href: '/admin', roles: ['admin'], icon: ShieldCheck },
  ]

  const visibleLinks = navLinks.filter((link) => link.roles.includes(user?.role || ''))

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = originalOverflow
    }
  }, [menuOpen])

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white shadow-lg ring-1 ring-gray-100 group-hover:shadow-xl transition-all">
            <img
              src="/icon.png"
              alt="ResQNet app icon"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-gray-900 leading-none">ResQNet</span>
            <span className="text-[9px] font-mono text-gray-400 font-bold">v0.1.6</span>
          </div>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden lg:flex items-center gap-8">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-gray-700 hover:text-primary-600 transition-colors font-semibold text-sm group"
            >
              {link.label}
              <div className="h-0.5 bg-primary-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </Link>
          ))}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-3 sm:gap-4">
          <NotificationCenter />
          <button
            onClick={toggleDarkMode}
            className="relative inline-flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <div className="relative w-10 h-6 bg-gray-200 dark:bg-slate-700 rounded-full transition-colors">
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-slate-900 rounded-full shadow-md transition-transform duration-300 ${darkMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 hidden sm:inline">{darkMode ? 'Dark' : 'Light'}</span>
          </button>
          {user && (
            <div className="hidden lg:flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 font-medium capitalize">{user.role}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-white bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg hover:shadow-red-500/30 rounded-xl font-bold transition-all active:scale-95"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Mobile/Tablet Menu Toggle */}
          <button className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} className="text-gray-700" /> : <Menu size={24} className="text-gray-700" />}
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Menu Overlay */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <button
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="absolute right-0 top-0 h-dvh w-[86%] max-w-sm bg-white dark:bg-slate-900 border-l border-gray-100 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h2 className="font-extrabold text-gray-900 dark:text-white tracking-tight">Menu</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Quick navigation</p>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
              {visibleLinks.map((link) => {
                const Icon = link.icon

                return (
                  <NavLink
                    key={link.href}
                    to={link.href}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-3 font-semibold transition-all ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-1 ring-primary-100 dark:ring-primary-800'
                          : 'text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                  </NavLink>
                )
              })}
            </nav>

            {user && (
              <div className="px-4 py-4 border-t border-gray-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-slate-800/70 px-3 py-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex w-full items-center justify-center gap-2.5 px-4 py-3 text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl transition-all font-bold active:scale-95"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </header>
  )
}

