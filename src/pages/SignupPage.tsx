import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Card from '@/components/Card'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'volunteer'>('user')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signup } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signup(email, password, name, role)
      navigate('/login')
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/40 via-white to-gray-50/40 flex items-center justify-center px-4 py-8">
      <Card variant="elevated" className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-500/30">
            <span className="text-2xl font-bold text-white">+</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Create Account</h1>
          <p className="text-gray-600 text-lg font-medium">Join ResQNet to help</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-red-100/50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm font-semibold">
              <p className="font-bold mb-1">Signup Failed</p>
              {error}
            </div>
          )}

          <Input
            type="text"
            placeholder="John Doe"
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            type="email"
            placeholder="you@example.com"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            placeholder="••••••••"
            label="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          <div>
            <label htmlFor="role" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 tracking-tight">
              I am a...
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'volunteer')}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100 font-medium"
            >
              <option value="user">🚨 Regular User</option>
              <option value="volunteer">🤝 Volunteer Responder</option>
            </select>
          </div>

          <Button type="submit" size="lg" isLoading={loading} className="w-full mt-8 shadow-lg shadow-primary-500/20">
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-600 text-sm font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-bold underline underline-offset-2 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
