import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '@/components/Header'
import Button from '@/components/Button'
import Card from '@/components/Card'
import ReportCard from '@/components/ReportCard'
import { reportsService, assignmentsService, realtimeService } from '@/services/database'
import { Report, Assignment } from '@/types'
import { AlertCircle, CheckCircle, TrendingUp, Flame } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'react-hot-toast'
import { notifyPopup } from '@/utils/notifications'
import SkeletonCard from '@/components/SkeletonCard'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [reports, setReports] = useState<Report[]>([])
  const [assignments, setAssignments] = useState<(Assignment & { reports: Report })[]>([])
  const [stats, setStats] = useState({ pending: 0, assigned: 0, resolved: 0, avgPriority: 0 })
  const [loading, setLoading] = useState(true)
  const [assignmentRealtimeHealthy, setAssignmentRealtimeHealthy] = useState(true)
  const [completingAssignmentId, setCompletingAssignmentId] = useState<string | null>(null)
  const [justCompletedAssignmentId, setJustCompletedAssignmentId] = useState<string | null>(null)
  const [pendingUpdateIds, setPendingUpdateIds] = useState<Set<string>>(new Set())
  const assignmentRealtimeHealthyRef = useRef(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.role === 'volunteer') {
          const { data: assignData } = await assignmentsService.getByVolunteerId(user.id)
          if (assignData) setAssignments(assignData as any)
        }

        const { data } = await reportsService.getAll()
        if (data) {
          setReports(data.slice(0, 6))
          const pending = data.filter((r: Report) => r.status === 'pending').length
          const assigned = data.filter((r: Report) => r.status === 'assigned').length
          const resolved = data.filter((r: Report) => r.status === 'resolved').length
          const avgPriority = Math.round(data.reduce((sum: number, r: Report) => sum + r.priority_score, 0) / (data.length || 1))

          setStats({ pending, assigned, resolved, avgPriority })
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    let assignmentSub: any
    let reportsSub: any

    if (user?.role === 'volunteer') {
      assignmentSub = realtimeService.subscribeToAssignments(
        user.id,
        (payload) => {
          if (payload.eventType === 'INSERT') {
            notifyPopup({
              title: 'New assignment received',
              message: 'An admin assigned an incident to you.',
              variant: 'success',
            })
            // For new assignments, we need the joined report data
            assignmentsService.getByVolunteerId(user.id).then(({ data }) => {
              if (data) {
                setAssignments(prev => {
                  const existingIds = new Set(prev.map(a => a.id));
                  const newItems = (data as any).filter((a: any) => !existingIds.has(a.id));
                  return [...newItems, ...prev];
                });
              }
            })
          } else if (payload.eventType === 'UPDATE') {
            // Update local state directly if it's not currently being updated by us
            const updatedId = payload.new.id;
            setAssignments(prev => prev.map(a => 
              a.id === updatedId ? { ...a, ...payload.new } : a
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setAssignments(prev => prev.filter(a => a.id !== deletedId));
          }
        },
        (status) => {
          const isHealthy = status === 'SUBSCRIBED'
          assignmentRealtimeHealthyRef.current = isHealthy
          setAssignmentRealtimeHealthy(isHealthy)
        }
      )
    }

    reportsSub = realtimeService.subscribeToReports(() => {
      reportsService.getAll().then(({ data }) => {
        if (data) {
          setReports(data.slice(0, 6))
          const pending = data.filter((r: Report) => r.status === 'pending').length
          const assigned = data.filter((r: Report) => r.status === 'assigned').length
          const resolved = data.filter((r: Report) => r.status === 'resolved').length
          const avgPriority = Math.round(data.reduce((sum: number, r: Report) => sum + r.priority_score, 0) / (data.length || 1))
          setStats({ pending, assigned, resolved, avgPriority })
        }
      })
    })

    // Polling fallback for missed realtime events (including DELETE).
    // Reduced frequency to avoid race conditions with optimistic updates.
    const assignmentPollId = window.setInterval(() => {
      if (user?.role === 'volunteer' && assignmentRealtimeHealthyRef.current === false) {
        assignmentsService.getByVolunteerId(user.id).then(({ data }) => {
          if (data) {
             setAssignments(prev => {
               // Merge logic to avoid overwriting pending local updates
               const newData = (data as any) as (Assignment & { reports: Report })[];
               return newData.map(newItem => {
                 const localItem = prev.find(p => p.id === newItem.id);
                 // If we have a local item and it's being updated, prefer local status
                 if (localItem && pendingUpdateIds.has(newItem.id)) {
                   return { ...newItem, status: localItem.status };
                 }
                 return newItem;
               });
             });
          }
        })
      }
    }, 30000)

    // Poll report list/stats as a safety net for missed report DELETE events.
    const reportsPollId = window.setInterval(() => {
      reportsService.getAll().then(({ data }) => {
        if (data) {
          setReports(data.slice(0, 6))
          const pending = data.filter((r: Report) => r.status === 'pending').length
          const assigned = data.filter((r: Report) => r.status === 'assigned').length
          const resolved = data.filter((r: Report) => r.status === 'resolved').length
          const avgPriority = Math.round(data.reduce((sum: number, r: Report) => sum + r.priority_score, 0) / (data.length || 1))
          setStats({ pending, assigned, resolved, avgPriority })
        }
      })
    }, 10000)

    return () => {
      window.clearInterval(assignmentPollId)
      window.clearInterval(reportsPollId)
      if (assignmentSub) assignmentSub.unsubscribe()
      if (reportsSub) reportsSub.unsubscribe()
    }
  }, [user])

  const handleUpdateAssignment = async (assignmentId: string, newStatus: string, reportId: string) => {
    // Prevent double clicking and lock the ID for optimistic updates
    if (pendingUpdateIds.has(assignmentId)) return;
    
    setPendingUpdateIds(prev => new Set(prev).add(assignmentId));
    
    // Optimistic update
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, status: newStatus as any } : a));

    try {
      if (newStatus === 'completed') {
        setCompletingAssignmentId(assignmentId)
      }

      const { error: updateError } = await assignmentsService.updateStatus(assignmentId, newStatus)
      if (updateError) throw updateError

      if (newStatus === 'completed') {
        const { error: reportError } = await reportsService.updateStatus(reportId, 'resolved')
        if (reportError) throw reportError
        
        notifyPopup({
          title: 'Task completed',
          message: 'Admin has been notified of completion.',
          variant: 'success',
        })
        setJustCompletedAssignmentId(assignmentId)
        setTimeout(() => setJustCompletedAssignmentId(null), 1800)
      } else if (newStatus === 'rejected') {
        const { error: reportError } = await reportsService.updateStatus(reportId, 'pending')
        if (reportError) throw reportError
      }

      if (newStatus !== 'completed' && newStatus !== 'rejected') {
        toast.success(`Assignment marked as ${newStatus}`)
      }
    } catch (err: any) {
      console.error('Assignment update error:', err)
      const detail = err.message || err.details || "Database permissions error"
      toast.error(`Error: ${detail}`)
      
      // Rollback optimistic update
      assignmentsService.getByVolunteerId(user?.id || '').then(({ data }) => {
        if (data) setAssignments(data as any)
      })
    } finally {
      setCompletingAssignmentId(null)
      // Small delay before unlocking to allow real-time events to propagate
      setTimeout(() => {
        setPendingUpdateIds(prev => {
          const next = new Set(prev);
          next.delete(assignmentId);
          return next;
        });
      }, 2000);
    }
  }

  let statCards = [
    {
      icon: <AlertCircle className="w-6 h-6" />,
      label: 'Pending',
      value: stats.pending,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      label: 'Resolved',
      value: stats.resolved,
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: 'Avg Priority',
      value: stats.avgPriority >= 70 ? '🔴 High' : stats.avgPriority >= 40 ? '🟡 Medium' : '🟢 Low',
      color: stats.avgPriority >= 70 ? 'text-red-500' : stats.avgPriority >= 40 ? 'text-orange-500' : 'text-green-500',
      bg: stats.avgPriority >= 70 ? 'bg-red-50' : stats.avgPriority >= 40 ? 'bg-orange-50' : 'bg-green-50',
    },
  ]

  if (user?.role !== 'user') {
    statCards.splice(1, 0, {
      icon: <Flame className="w-6 h-6" />,
      label: 'Assigned',
      value: stats.assigned,
      color: 'text-red-500',
      bg: 'bg-red-50',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-gray-600">Real-time disaster response overview</p>
            {user?.role === 'volunteer' && (
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  assignmentRealtimeHealthy ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {assignmentRealtimeHealthy ? 'Live' : 'Syncing'}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className={`grid ${user?.role === 'user' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'} gap-4 mb-8`}>
          {statCards.map((stat) => (
            <Card key={stat.label} className={`${stat.bg} border-0`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color}`}>{stat.icon}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Volunteer specific view overrides generic reports logic */}
        {user?.role === 'volunteer' ? (
          <div className="mb-12 z-0 relative">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>
              <Link to="/map" className="text-primary-500 hover:text-primary-600 font-semibold">
                Open Full Map →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-0 relative">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <div className="space-y-12">
                {/* Active Assignments */}
                {assignments.filter(a => a.status === 'accepted').length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                       🚀 Active Missions
                       <span className="bg-blue-100 px-2 py-0.5 rounded-full text-sm font-bold">{assignments.filter(a => a.status === 'accepted').length}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {assignments.filter(a => a.status === 'accepted').map((assignment) => (
                        <Card key={assignment.id} className="flex flex-col border-blue-200 shadow-blue-50">
                          <div className="flex-1 pointer-events-none mb-4 -mx-2 -mt-2">
                            {assignment.reports && <ReportCard report={{ ...assignment.reports, status: assignment.reports.status as any } as Report} />}
                          </div>
                          <div className="mt-auto px-1 border-t border-gray-100 pt-4">
                            <Button
                              className="w-full !bg-blue-600 hover:!bg-blue-700 font-bold"
                              onClick={() => handleUpdateAssignment(assignment.id, 'completed', assignment.report_id)}
                              disabled={completingAssignmentId === assignment.id}
                            >
                              {justCompletedAssignmentId === assignment.id ? '✅ Completed!' : '🚀 Mark as Completed'}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {/* Pending Assignments */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    📋 New Dispatches (Pending)
                    <span className="bg-gray-200 px-2 py-0.5 rounded-full text-sm font-bold">{assignments.filter(a => a.status === 'pending').length}</span>
                  </h3>
                  {assignments.filter(a => a.status === 'pending').length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {assignments.filter(a => a.status === 'pending').map((assignment) => (
                        <Card key={assignment.id} className="flex flex-col">
                          <div className="flex-1 pointer-events-none mb-4 -mx-2 -mt-2">
                            {assignment.reports && <ReportCard report={{ ...assignment.reports, status: assignment.reports.status as any } as Report} />}
                          </div>
                          <div className="mt-auto px-1 border-t border-gray-100 pt-4">
                            <div className="flex gap-3">
                              <Button className="flex-1 !bg-green-600 hover:!bg-green-700" onClick={() => handleUpdateAssignment(assignment.id, 'accepted', assignment.report_id)}>
                                Accept
                              </Button>
                              <Button className="flex-1 !bg-red-500 hover:!bg-red-600" onClick={() => handleUpdateAssignment(assignment.id, 'rejected', assignment.report_id)}>
                                Decline
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="text-center py-12 bg-gray-50 border-dashed border-2 border-gray-200">
                      <p className="text-gray-600 font-medium">No new pending dispatches at this moment.</p>
                      <p className="text-gray-400 text-sm mt-1">Check back later or refresh the page.</p>
                    </Card>
                  )}
                </section>
                
                {/* Completed (Recent) */}
                {assignments.filter(a => a.status === 'completed').length > 0 && (
                  <section>
                    <button 
                      onClick={() => {
                        const el = document.getElementById('completed-tasks');
                        if (el) el.classList.toggle('hidden');
                      }}
                      className="text-gray-400 hover:text-gray-600 text-sm font-medium flex items-center gap-1"
                    >
                      Show Completed Tasks ({assignments.filter(a => a.status === 'completed').length})
                    </button>
                    <div id="completed-tasks" className="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 opacity-60">
                      {assignments.filter(a => a.status === 'completed').slice(0, 4).map((assignment) => (
                        <Card key={assignment.id} className="p-3 text-xs">
                          <p className="font-bold truncate">{assignment.reports?.title}</p>
                          <p className="text-green-600 mt-1 font-semibold flex items-center gap-1">✅ Resolved</p>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Standard User / Admin generic views */}
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              {user?.role === 'user' && (
                <Link to="/report" className="flex-1">
                  <Button size="lg" className="w-full">
                    📝 Report Incident
                  </Button>
                </Link>
              )}

              <Link to="/map" className="flex-1">
                <Button variant={user?.role === 'admin' ? 'primary' : 'secondary'} size="lg" className="w-full">
                  🗺️ View Map
                </Button>
              </Link>

              {user?.role === 'user' && (
                <Link to="/my-reports" className="flex-1">
                  <Button variant="outline" size="lg" className="w-full">
                    📋 My Reports
                  </Button>
                </Link>
              )}

              {user?.role === 'admin' && (
                <Link to="/admin" className="flex-1">
                  <Button variant="primary" size="lg" className="w-full">
                    ⚙️ Admin Portal
                  </Button>
                </Link>
              )}
            </div>

            {/* Recent Reports */}
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Reports</h2>
                <Link to="/map" className="text-primary-500 hover:text-primary-600 font-semibold">
                  View All →
                </Link>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
                </div>
              ) : reports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reports.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <p className="text-gray-600 mb-4 text-lg font-medium">✨ All clear! There are no incident reports to display.</p>
                  {user?.role === 'user' && (
                    <Link to="/report">
                      <Button>Create First Report</Button>
                    </Link>
                  )}
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
