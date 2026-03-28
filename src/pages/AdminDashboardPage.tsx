import { useEffect, useState, useRef } from 'react'
import Header from '@/components/Header'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { reportsService, assignmentsService, usersService, realtimeService } from '@/services/database'
import { Report, User } from '@/types'
import ReportCard from '@/components/ReportCard'
import { User as UserIcon, ChevronDown, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Modal from '@/components/Modal'
import { notifyPopup } from '@/utils/notifications'
import SkeletonCard from '@/components/SkeletonCard'

export default function AdminDashboardPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [filter, setFilter] = useState('pending')
  const [assigningTo, setAssigningTo] = useState('')
  const [volunteers, setVolunteers] = useState<User[]>([])
  const [volunteersError, setVolunteersError] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<string | null>(null)
  const [realtimeHealthy, setRealtimeHealthy] = useState(true)
  const [refreshingVolunteers, setRefreshingVolunteers] = useState(false)
  const [assigningReportId, setAssigningReportId] = useState<string | null>(null)
  const [justAssignedReportId, setJustAssignedReportId] = useState<string | null>(null)
  const realtimeHealthyRef = useRef(true)
  const knownReportIdsRef = useRef<Set<string>>(new Set())
  const initialReportsLoadedRef = useRef(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchVolunteers = async (showToast = false) => {
    setRefreshingVolunteers(true)
    const { data: vData, error: vError } = await usersService.getAllVolunteers()
    if (vError) {
      setVolunteersError(vError.message || JSON.stringify(vError))
      if (showToast) toast.error('Failed to refresh volunteers')
      setRefreshingVolunteers(false)
      return
    }
    if (!vData || vData.length === 0) {
      const { data: allUsers, error: allUsersError } = await usersService.getAllVisibleUsers()
      if (allUsersError) {
        setVolunteersError(`Failed to fetch users: ${allUsersError.message}. Check your database connection and RLS policies.`)
      } else if (allUsers && allUsers.length > 0) {
        const roles = Array.from(new Set(allUsers.map(u => u.role))).join(', ')
        setVolunteersError(
          `No users with role 'volunteer' found. Existing roles: [${roles}]. Please update a user's role to 'volunteer' in the database.`
        )
      } else {
        setVolunteersError("No users found in the database. Ensure users have signed up.")
      }
    } else {
      setVolunteersError(null)
      if (showToast) toast.success(`Refreshed ${vData.length} volunteer${vData.length > 1 ? 's' : ''}`)
    }
    setVolunteers((vData as any) || [])
    setRefreshingVolunteers(false)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setIsDropdownOpen(false)
  }, [selectedReport])

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data } = await reportsService.getAll()
        if (data) {
          if (!initialReportsLoadedRef.current) {
            knownReportIdsRef.current = new Set(data.map((r) => r.id))
            initialReportsLoadedRef.current = true
          } else {
            const newlyArrived = data.filter((r) => !knownReportIdsRef.current.has(r.id))
            if (newlyArrived.length > 0) {
              notifyPopup({
                title: '🚨 New incident reported',
                message:
                  newlyArrived.length === 1
                    ? 'A user submitted a new report.'
                    : `${newlyArrived.length} new incident reports were submitted.`,
                variant: 'success',
              })
            }
            knownReportIdsRef.current = new Set(data.map((r) => r.id))
          }
          setReports(data)
        }
        await fetchVolunteers()
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()

    const reportsSub = realtimeService.subscribeToReports(
      (payload) => {
        if (payload.eventType === 'INSERT') {
          // Keep this for immediate realtime signal; fetchReports fallback avoids misses.
          if (!payload.new?.id || !knownReportIdsRef.current.has(payload.new.id)) {
            notifyPopup({
              title: '🚨 New incident reported',
              message: 'A user submitted a new report.',
              variant: 'success',
            })
          }
        }
        if (payload.eventType === 'UPDATE' && payload.new?.status === 'resolved') {
          notifyPopup({
            title: '✅ Incident completed',
            message: 'A volunteer marked an assigned incident as completed.',
            variant: 'success',
          })
        }
        fetchReports()
      },
      (status) => {
        const isHealthy = status === 'SUBSCRIBED'
        realtimeHealthyRef.current = isHealthy
        setRealtimeHealthy(isHealthy)
      }
    )

    // Keep volunteer list fresh for newly added volunteers.
    const usersPollId = window.setInterval(fetchVolunteers, 5000)

    // Always-on lightweight sync: catches missed realtime INSERT events.
    const reportsSyncId = window.setInterval(() => {
      fetchReports()
    }, 6000)

    return () => {
      window.clearInterval(usersPollId)
      window.clearInterval(reportsSyncId)
      if (reportsSub) reportsSub.unsubscribe()
    }
  }, [])

  const filteredReports = reports.filter((report) => {
    if (filter === 'all') return true
    return report.status === filter
  })

  const handleAssignVolunteer = async (reportId: string, volunteerId: string) => {
    const cleanVolunteerId = volunteerId.trim()
    
    if (!cleanVolunteerId) {
      toast.error('Please select a volunteer from the list')
      return
    }

    const selectedVolunteer = volunteers.find((v) => v.id === cleanVolunteerId)
    if (!selectedVolunteer) {
      toast.error('Please select a valid volunteer from the list')
      return
    }

    try {
      setAssigningReportId(reportId)
      const { error: assignError } = await assignmentsService.create({
        report_id: reportId,
        volunteer_id: cleanVolunteerId,
        status: 'pending',
      })
      if (assignError) throw assignError

      const { error: updateError } = await reportsService.updateStatus(reportId, 'assigned')
      if (updateError) throw updateError

      setReports(reports.map((r) => (r.id === reportId ? { ...r, status: 'assigned' } : r)))
      setAssigningTo('')
      setSelectedReport((current) => (current?.id === reportId ? { ...current, status: 'assigned' } : current))
      setJustAssignedReportId(reportId)
      setTimeout(() => setJustAssignedReportId(null), 1800)
      notifyPopup({
        title: '📋 Volunteer assigned',
        message: 'Task was dispatched successfully.',
        variant: 'success',
      })
    } catch (error: any) {
      const detail = [error?.code, error?.message].filter(Boolean).join(' - ')
      toast.error('Failed to assign volunteer: ' + (detail || 'Database permissions error'))
      console.error(error)
    } finally {
      setAssigningReportId(null)
    }
  }

  const handleResolveReport = async (reportId: string) => {
    try {
      const { error: updateError } = await reportsService.updateStatus(reportId, 'resolved')
      if (updateError) throw updateError

      setReports(reports.map((r) => (r.id === reportId ? { ...r, status: 'resolved' } : r)))
      setSelectedReport(null)
      toast.success('Report marked as resolved')
    } catch (error: any) {
      toast.error('Failed to resolve report: ' + (error.message || 'Database permissions error'))
      console.error(error)
    }
  }

  const executeDelete = async () => {
    if (!reportToDelete) return

    try {
      const targetReportId = reportToDelete
      const { count, error: deleteError } = await reportsService.delete(targetReportId)
      if (deleteError) throw deleteError

      // If no row reported as deleted, verify whether the report still exists
      // before treating it as an RLS/permission failure.
      if (!count) {
        const { data: stillThere, error: verifyError } = await reportsService.getById(targetReportId)
        if (verifyError) throw verifyError
        if (stillThere) {
          throw new Error('Deletion blocked by database security policies. Make sure your user has admin delete permission.')
        }
      }

      setReports(prev => prev.filter((r) => r.id !== targetReportId))
      setSelectedReport(null)
      setReportToDelete(null)
      toast.success('Report permanently deleted')
    } catch (error: any) {
      toast.error('Failed to delete report: ' + (error.message || 'Database permissions error'))
      console.error(error)
    }
  }

  const handleDeleteReport = (reportId: string) => {
    setReportToDelete(reportId)
  }

  const stats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    assigned: reports.filter((r) => r.status === 'assigned').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <div className="mb-8 flex items-center gap-3 flex-wrap">
          <p className="text-gray-600">Manage incidents and assign volunteers</p>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              realtimeHealthy ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {realtimeHealthy ? 'Live' : 'Syncing'}
          </span>
        </div>
        {!realtimeHealthy && (
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Live updates are temporarily unavailable. Auto-refresh fallback is active.
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Reports', value: stats.total },
            { label: 'Pending', value: stats.pending },
            { label: 'Assigned', value: stats.assigned },
            { label: 'Resolved', value: stats.resolved },
          ].map((stat) => (
            <Card key={stat.label} className="text-center">
              <p className="text-gray-600 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-primary-500">{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['pending', 'assigned', 'resolved', 'all'].map((f) => (
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Reports List */}
          <div className="md:col-span-1 lg:col-span-2">
            {loading ? (
              <div className="space-y-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : filteredReports.length > 0 ? (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`cursor-pointer p-4 rounded-lg border transition-all ${
                      selectedReport?.id === report.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 min-w-0 break-words">{report.title}</h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded capitalize ${
                        report.status === 'pending'
                          ? 'bg-orange-100 text-orange-800'
                          : report.status === 'assigned'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{report.description.substring(0, 100)}...</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{report.category}</span>
                      <span className={`font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        report.priority_score >= 70 ? 'bg-red-100 text-red-800' :
                        report.priority_score >= 40 ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {report.priority_score >= 70 ? '🔴 High' : report.priority_score >= 40 ? '🟡 Medium' : '🟢 Low'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <p className="text-gray-600 text-lg font-medium">✨ All clear! There are no incident reports to display.</p>
              </Card>
            )}
          </div>

          {/* Detail Panel */}
          {selectedReport && (
            <div>
              <Card>
                <ReportCard report={selectedReport} />

                {selectedReport.status !== 'resolved' ? (
                  <div className="mt-6 space-y-4 pt-6 border-t border-gray-200">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Assign to Volunteer
                        </label>
                        <button
                          type="button"
                          onClick={() => fetchVolunteers(true)}
                          disabled={refreshingVolunteers}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                        >
                          {refreshingVolunteers ? 'Refreshing...' : 'Refresh Volunteers'}
                        </button>
                      </div>
                      <div className="relative" ref={dropdownRef}>
                        <div 
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className={`w-full pl-11 pr-10 py-3 border-2 rounded-xl bg-white text-gray-700 font-medium transition-all duration-200 cursor-pointer flex items-center justify-between ${isDropdownOpen ? 'border-primary-500 ring-4 ring-primary-50 shadow-sm' : 'border-gray-200 hover:border-primary-300 hover:shadow-sm'}`}
                        >
                          <UserIcon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${isDropdownOpen ? 'text-primary-500' : 'text-gray-400'}`} />
                          <span className="truncate select-none">
                            {assigningTo 
                              ? (() => {
                                  const v = volunteers.find(vol => vol.id === assigningTo)
                                  return v ? `${v.name} • ${v.email}` : 'Select a volunteer responder...'
                                })()
                              : 'Select a volunteer responder...'}
                          </span>
                          <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-primary-500' : 'text-gray-400'}`} />
                        </div>

                        {isDropdownOpen && (
                          <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto py-2 shadow-gray-200/50 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                            {volunteersError ? (
                              <div className="px-4 py-8 text-sm text-red-500 text-center flex flex-col items-center justify-center gap-3">
                                <span className="font-bold text-red-600">Database Error:</span>
                                <span>{volunteersError}</span>
                                <span className="text-xs text-gray-400 mt-2">Try logging out and logging back in.</span>
                              </div>
                            ) : volunteers.length === 0 ? (
                              <div className="px-4 py-8 text-sm text-gray-500 text-center flex flex-col items-center justify-center gap-3">
                                <div className="p-3 bg-gray-50 rounded-full border border-gray-100">
                                  <UserIcon className="w-8 h-8 text-gray-300" />
                                </div>
                                <span className="font-semibold text-gray-700">No volunteers found</span>
                                <span className="text-xs text-red-500 max-w-[85%]">
                                  Make sure you ran <b>final_admin_rls.sql</b> in Supabase so Admins have read access.
                                </span>
                                <Button size="sm" onClick={() => fetchVolunteers(true)}>
                                  Refresh Volunteers
                                </Button>
                              </div>
                            ) : (
                              volunteers.map(v => (
                                <div
                                  key={v.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setAssigningTo(v.id)
                                    setIsDropdownOpen(false)
                                  }}
                                  className={`px-4 py-3 cursor-pointer transition-all duration-150 flex items-center justify-between ${assigningTo === v.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                                >
                                  <div className="flex flex-col">
                                    <span className={`font-semibold ${assigningTo === v.id ? 'text-gray-900' : 'text-gray-700'}`}>{v.name}</span>
                                    <span className={`text-xs mt-0.5 ${assigningTo === v.id ? 'text-gray-600' : 'text-gray-500'}`}>{v.email}</span>
                                  </div>
                                  {assigningTo === v.id && (
                                    <Check className="w-5 h-5 text-gray-700" />
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {(selectedReport.status === 'pending' || justAssignedReportId === selectedReport.id) && (
                      <Button
                        onClick={() => handleAssignVolunteer(selectedReport.id, assigningTo)}
                        className="w-full"
                        disabled={assigningReportId === selectedReport.id || selectedReport.status !== 'pending'}
                      >
                        {justAssignedReportId === selectedReport.id ? 'Assigned!' : 'Assign Volunteer'}
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      onClick={() => handleResolveReport(selectedReport.id)}
                      className="w-full"
                    >
                      Mark as Resolved
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col items-center">
                    <p className="text-green-600 font-semibold bg-green-50 py-3 px-6 rounded-lg border border-green-200 w-full text-center mb-4">
                      ✓ This incident has been fully resolved
                    </p>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                      onClick={() => handleDeleteReport(selectedReport.id)}
                    >
                      Delete Report
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!reportToDelete}
        onClose={() => setReportToDelete(null)}
        title="Delete Incident Report"
        footer={
          <>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setReportToDelete(null)}>Cancel</Button>
            <Button className="w-full sm:w-auto !bg-red-600 hover:!bg-red-700 !text-white" onClick={executeDelete}>Yes, Delete Report</Button>
          </>
        }
      >
        <p className="text-gray-600 mb-4">
          Are you absolutely sure you want to delete this incident report? This action is permanent and cannot be undone.
        </p>
      </Modal>

      {selectedReport && (selectedReport.status === 'pending' || justAssignedReportId === selectedReport.id) && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 backdrop-blur border-t border-gray-200 p-3 z-40">
          <Button
            onClick={() => handleAssignVolunteer(selectedReport.id, assigningTo)}
            className="w-full"
            disabled={!assigningTo || assigningReportId === selectedReport.id || selectedReport.status !== 'pending'}
          >
            {justAssignedReportId === selectedReport.id ? 'Assigned!' : 'Assign Volunteer'}
          </Button>
        </div>
      )}
    </div>
  )
}
