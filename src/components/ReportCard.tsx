import { AlertCircle, CheckCircle, Clock, Flame } from 'lucide-react'
import { Report } from '@/types'

interface ReportCardProps {
  report: Report
  onClick?: () => void
}

const categoryIcons = {
  fire: <Flame className="w-5 h-5" />,
  medical: <AlertCircle className="w-5 h-5" />,
  accident: <AlertCircle className="w-5 h-5" />,
  flood: <AlertCircle className="w-5 h-5" />,
  other: <AlertCircle className="w-5 h-5" />,
}

const statusIcons = {
  pending: <Clock className="w-4 h-4" />,
  assigned: <AlertCircle className="w-4 h-4" />,
  resolved: <CheckCircle className="w-4 h-4" />,
}

const priorityColors = {
  high: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  medium: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
}

function getPriorityLevel(score: number): keyof typeof priorityColors {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export default function ReportCard({ report, onClick }: ReportCardProps) {
  const priority = getPriorityLevel(report.priority_score)

  const priorityBgGradient = {
    high: 'from-red-50 dark:from-red-950/40 to-orange-50 dark:to-orange-950/40 border-l-red-500',
    medium: 'from-orange-50 dark:from-orange-950/40 to-amber-50 dark:to-amber-950/40 border-l-orange-500',
    low: 'from-green-50 dark:from-green-950/40 to-emerald-50 dark:to-emerald-950/40 border-l-green-500',
  }

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${priorityBgGradient[priority]} rounded-2xl border border-gray-100 dark:border-slate-700/50 border-l-4 p-5 hover:shadow-lg dark:hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 bg-white dark:bg-slate-700 rounded-xl shadow-sm ${priority === 'high' ? 'text-red-600 dark:text-red-400' : priority === 'medium' ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
            {categoryIcons[report.category]}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white capitalize text-sm">{report.category}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
          report.status === 'pending' ? 'bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300' :
          report.status === 'assigned' ? 'bg-blue-200 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300' :
          'bg-green-200 dark:bg-green-900/40 text-green-900 dark:text-green-300'
        }`}>
          {statusIcons[report.status]}
          <span className="capitalize">{report.status}</span>
        </div>
      </div>

      <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">{report.title}</h2>
      <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-2 whitespace-pre-line break-words font-medium">{report.description}</p>

      {report.image_url && (
        <img alt="Report" src={report.image_url} className="w-full h-48 object-cover rounded-xl mb-4 group-hover:scale-[1.02] transition-transform duration-300" />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
        <span className={`text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
          priority === 'high' ? 'bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-300' :
          priority === 'medium' ? 'bg-orange-200 dark:bg-orange-900/40 text-orange-900 dark:text-orange-300' :
          'bg-green-200 dark:bg-green-900/40 text-green-900 dark:text-green-300'
        }`}>
          {priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢'} 
          <span className="capitalize">{priority} Priority</span>
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400 break-all font-semibold">
          📍 {Number(report.latitude).toFixed(3)}, {Number(report.longitude).toFixed(3)}
        </span>
      </div>
    </div>
  )
}
