import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Card from '@/components/Card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      console.error("Login catch full error:", err);
      const msg = err?.message || err?.error_description || (typeof err === 'string' ? err : JSON.stringify(err));
      setError(msg && msg !== '{}' ? msg : 'Login failed due to an unknown database collision.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/40 via-white to-gray-50/40 flex items-center justify-center px-4 py-8">
      <Card variant="elevated" className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">ResQNet</h1>
          <p className="text-gray-600 text-lg font-medium">AI Disaster Response</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-red-100/50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm font-semibold">
              <p className="font-bold mb-1">Login Failed</p>
              {error}
            </div>
          )}

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
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" size="lg" isLoading={loading} className="w-full mt-8 shadow-lg shadow-primary-500/20">
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-600 text-sm font-medium">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-bold underline underline-offset-2 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
