import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import MapView from '@/components/MapView'
import ReportCard from '@/components/ReportCard'
import Card from '@/components/Card'
import { reportsService } from '@/services/database'
import { Report } from '@/types'

export default function MapViewPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data } = await reportsService.getAll()
        if (data) {
          setReports(data)
        }
      } catch (error) {
        console.error('Failed to fetch reports:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  const filteredReports = reports.filter((report) => {
    if (filter === 'all') return true
    if (filter === 'high') return report.priority_score >= 70
    if (filter === 'medium') return report.priority_score >= 40 && report.priority_score < 70
    if (filter === 'low') return report.priority_score < 40
    if (filter === 'pending') return report.status === 'pending'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Active Incidents Map</h1>
        <p className="text-gray-600 mb-8">Real-time view of all reported incidents</p>

        {/* Map */}
        {loading ? (
          <Card className="text-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
          </Card>
        ) : (
          <MapView reports={filteredReports} onMarkerClick={setSelectedReport} />
        )}

        {/* Filter */}
        <div className="flex flex-wrap gap-2 my-6">
          {[
            { value: 'all', label: '📍 All' },
            { value: 'high', label: '🔴 High Priority' },
            { value: 'medium', label: '🟠 Medium Priority' },
            { value: 'low', label: '🟢 Low Priority' },
            { value: 'pending', label: '⏳ Pending' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-primary-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        {selectedReport && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Incident Details</h2>
            <ReportCard report={selectedReport} />
          </div>
        )}

        {/* List View */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            All Reports ({filteredReports.length})
          </h2>
          {filteredReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onClick={() => setSelectedReport(report)}
                />
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-gray-600">No reports match the selected filter</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
