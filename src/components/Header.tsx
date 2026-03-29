import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import NotificationCenter from './NotificationCenter'

export default function Header() {
  const { user, logout } = useAuthStore()
  const { darkMode, toggleDarkMode } = useUIStore()
  const navigate = useNavigate()
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
    { label: 'Dashboard', href: '/dashboard', roles: ['user', 'volunteer', 'admin'] },
    { label: 'Report Incident', href: '/report', roles: ['user'] },
    { label: 'Map View', href: '/map', roles: ['user', 'volunteer', 'admin'] },
    { label: 'My Reports', href: '/my-reports', roles: ['user'] },
    { label: 'Admin', href: '/admin', roles: ['admin'] },
  ]

  const visibleLinks = navLinks.filter((link) => link.roles.includes(user?.role || ''))

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
            <span className="text-lg font-black text-white">+</span>
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
        <div className="lg:hidden absolute top-full left-0 w-full bg-white dark:bg-slate-900/95 backdrop-blur-lg shadow-2xl border-t border-gray-100 dark:border-slate-800 z-50 animate-in fade-in slide-in-from-left duration-200">
          <nav className="flex flex-col p-4 space-y-1 max-w-md">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block text-gray-900 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors font-semibold py-3 px-4"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="px-4 text-xs text-gray-500 mb-3 font-bold uppercase tracking-wide">Account</p>
                <p className="px-4 text-sm text-gray-900 font-bold mb-3">{user.name}</p>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-white bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg hover:shadow-red-500/30 rounded-xl transition-all font-bold active:scale-95"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

