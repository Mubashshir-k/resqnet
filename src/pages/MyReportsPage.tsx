import { useEffect, useRef, useState } from 'react'
import Header from '@/components/Header'
import ReportCard from '@/components/ReportCard'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { useAuthStore } from '@/store/authStore'
import { reportsService, realtimeService } from '@/services/database'
import { Report } from '@/types'
import { Link } from 'react-router-dom'
import { notifyPopup } from '@/utils/notifications'
import SkeletonCard from '@/components/SkeletonCard'

export default function MyReportsPage() {
  const { user } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'assigned' | 'resolved'>('all')
  const previousStatusesRef = useRef<Record<string, Report['status']>>({})

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return

      try {
        const { data } = await reportsService.getByUserId(user.id)
        if (data) {
          // Notify reporter on meaningful status transitions.
          data.forEach((report) => {
            const previous = previousStatusesRef.current[report.id]
            if (previous && previous !== report.status) {
              if (report.status === 'assigned') {
                notifyPopup({
                  title: 'Volunteer assigned',
                  message: `Your report "${report.title}" is now assigned.`,
                  variant: 'success',
                })
              } else if (report.status === 'resolved') {
                notifyPopup({
                  title: 'Incident resolved',
                  message: `Your report "${report.title}" has been marked as resolved.`,
                  variant: 'success',
                })
              }
            }
            previousStatusesRef.current[report.id] = report.status
          })
          setReports(data)
        }
      } catch (error) {
        console.error('Failed to fetch reports:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()

    let subscription: any
    if (user) {
      subscription = realtimeService.subscribeToReports(() => {
        fetchReports()
      })
    }

    // Safety net for missed realtime events (especially DELETE).
    const pollId = window.setInterval(() => {
      fetchReports()
    }, 10000)

    return () => {
      window.clearInterval(pollId)
      if (subscription) subscription.unsubscribe()
    }
  }, [user])

  const filteredReports = reports.filter((report) => {
    if (filter === 'all') return true
    return report.status === filter
  })

  const stats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    assigned: reports.filter((r) => r.status === 'assigned').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Reports</h1>
            <p className="text-gray-600 dark:text-gray-400">Track all your submitted incidents</p>
          </div>
          {user?.role === 'user' && (
            <Link to="/report">
              <Button size="lg" className="w-full sm:w-auto">📝 New Report</Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className={`grid ${user?.role === 'user' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} gap-4 mb-8`}>
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-600', show: true },
            { label: 'Pending', value: stats.pending, color: 'text-orange-600', show: true },
            { label: 'Assigned', value: stats.assigned, color: 'text-red-600', show: user?.role !== 'user' },
            { label: 'Resolved', value: stats.resolved, color: 'text-green-600', show: true },
          ].filter(s => s.show).map((stat) => (
            <Card key={stat.label} className="text-center">
              <p className="text-gray-600 text-sm">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'pending', 'assigned', 'resolved'] as const)
            .filter(f => f !== 'assigned' || user?.role !== 'user')
            .map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-primary-500'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <p className="text-gray-600 mb-4">
              {user?.role === 'volunteer' ? 'No assignments or reports found' : 'No reports found'}
            </p>
            {user?.role === 'user' && (
              <Link to="/report">
                <Button>Create First Report</Button>
              </Link>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
