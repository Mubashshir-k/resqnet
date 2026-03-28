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
  high: 'bg-red-100 text-red-800',
  medium: 'bg-orange-100 text-orange-800',
  low: 'bg-green-100 text-green-800',
}

function getPriorityLevel(score: number): keyof typeof priorityColors {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export default function ReportCard({ report, onClick }: ReportCardProps) {
  const priority = getPriorityLevel(report.priority_score)

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-primary-500">{categoryIcons[report.category]}</div>
          <div>
            <h3 className="font-semibold text-gray-900 capitalize">{report.category}</h3>
            <p className="text-xs text-gray-500">
              {new Date(report.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${priorityColors[priority]}`}>
          {statusIcons[report.status]}
          <span className="capitalize">{report.status}</span>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-2">{report.title}</h2>
      <p className="text-gray-600 text-sm mb-3 line-clamp-3 whitespace-pre-line break-words">{report.description}</p>

      {report.image_url && (
        <img alt="Report" src={report.image_url} className="w-full h-40 object-cover rounded mb-3" />
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-gray-100">
        <span className={`text-sm font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${priorityColors[priority]}`}>
          {priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢'} 
          <span className="capitalize">{priority}</span>
        </span>
        <span className="text-xs text-gray-500 break-all">
          📍 {Number(report.latitude).toFixed(3)}, {Number(report.longitude).toFixed(3)}
        </span>
      </div>
    </div>
  )
}
