import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react'
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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-bold text-primary-500">ResQNet</span>
          <span className="text-[10px] font-mono text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded leading-none">v0.1.6</span>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden lg:flex items-center gap-6">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-gray-700 hover:text-primary-500 transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-gray-700" />}
          </button>
          {user && (
            <div className="hidden lg:flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full max-w-[260px] truncate">
                {user.name} <span className="text-gray-400 capitalize">({user.role})</span>
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg font-bold transition-all active:scale-95"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Mobile/Tablet Menu Toggle */}
          <button className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Menu Overlay */}
      {menuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t border-gray-100 z-50">
          <nav className="flex flex-col p-4 space-y-1">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block text-gray-900 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors font-semibold py-3 px-4"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <div className="mt-2 pt-4 border-t border-gray-100">
                <p className="px-4 text-sm text-gray-500 mb-2 font-medium">Signed in as {user.name}</p>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold active:scale-95"
                >
                  <LogOut size={20} />
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
