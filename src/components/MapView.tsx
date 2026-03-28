import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Report } from '@/types'

const customMarkerIcon = (color: string, score: number) => {
  const html = `
    <div style="
      background-color: ${color};
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 0.875rem;
    ">
      ${score}
    </div>
  `
  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

// Sub-component to auto-zoom to fit markers since MapContainer bounds props are static on load
function MapBounds({ reports }: { reports: Report[] }) {
  const map = useMap()
  
  if (reports.length > 0) {
    const validReports = reports.filter(r => !isNaN(Number(r.latitude)) && !isNaN(Number(r.longitude)))
    if (validReports.length > 0) {
      const bounds = L.latLngBounds(validReports.map(r => [Number(r.latitude), Number(r.longitude)] as [number, number]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }
  return null
}

interface MapViewProps {
  reports: Report[]
  onMarkerClick?: (report: Report) => void
}

export default function MapView({ reports, onMarkerClick }: MapViewProps) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  const handleMarkerClick = (report: Report) => {
    setSelectedReport(report)
    onMarkerClick?.(report)
  }

  const priorityColor = (score: number) => {
    if (score >= 70) return '#ef4444' // red-500
    if (score >= 40) return '#f97316' // orange-500
    return '#22c55e' // green-500
  }

  const validReports = reports.filter(r => !isNaN(Number(r.latitude)) && !isNaN(Number(r.longitude)))

  // Default to a 0,0 center if no valid reports
  const center: [number, number] = validReports.length > 0 
    ? [Number(validReports[0].latitude), Number(validReports[0].longitude)] 
    : [20, 0]

  return (
    <div className="w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex flex-col shadow-sm">
      <div className="h-[300px] md:h-[500px] w-full relative z-0">
        <MapContainer 
          center={center} 
          zoom={5} 
          className="h-full w-full rounded-t-lg"
          style={{ height: '100%', width: '100%' }}
        >
          {/* Using Google Maps standard tiles for familiarity */}
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          />
          <MapBounds reports={validReports} />
          
          {validReports.map((report) => {
            const lat = Number(report.latitude)
            const lon = Number(report.longitude)

            return (
              <Marker 
                key={report.id} 
                position={[lat, lon]}
                icon={customMarkerIcon(priorityColor(report.priority_score), report.priority_score)}
                eventHandlers={{
                  click: () => handleMarkerClick(report),
                }}
              >
                <Popup className="leaflet-popup-custom">
                  <div className="text-sm font-sans min-w-[200px] -m-1">
                    <div className="font-bold text-gray-900 mb-1 leading-tight">{report.title}</div>
                    <div className="text-gray-600 mb-2 leading-snug whitespace-pre-line break-words max-h-32 overflow-y-auto pr-1 text-xs">{report.description}</div>
                    <div className="flex flex-wrap gap-2 text-xs mb-3">
                      <span className={`px-2 py-1 font-medium rounded flex items-center gap-1 border ${
                        report.priority_score >= 70 ? 'bg-red-50 text-red-700 border-red-200' :
                        report.priority_score >= 40 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {report.priority_score >= 70 ? '🔴 High' : report.priority_score >= 40 ? '🟡 Medium' : '🟢 Low'}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 font-medium rounded uppercase text-gray-800 border border-gray-200">{report.status}</span>
                    </div>
                    {/* Link to open in Google Maps App */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-blue-600 hover:bg-blue-700 !text-white font-medium py-2 px-3 rounded text-xs transition-colors hover:!text-white"
                    >
                      📍 Open in Google Maps
                    </a>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* Info Panel completely preserving standard React UI fields */}
      {selectedReport && (
        <div className="p-5 bg-white border-t border-gray-200 shadow-inner">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-xl text-gray-900">{selectedReport.title}</h3>
            <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-semibold uppercase text-gray-600">
              {selectedReport.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4 whitespace-pre-line break-words">{selectedReport.description}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div>
              <p className="text-gray-500 font-medium text-xs mb-1">Category</p>
              <p className="font-semibold capitalize text-gray-900">{selectedReport.category}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium text-xs mb-1">Priority</p>
              <p className="font-semibold text-gray-900 flex items-center gap-1">
                {selectedReport.priority_score >= 70 ? '🔴 High' : selectedReport.priority_score >= 40 ? '🟡 Medium' : '🟢 Low'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 font-medium text-xs mb-1">Coordinates</p>
              <p className="text-gray-900 font-mono text-xs flex justify-between items-center">
                <span>{Number(selectedReport.latitude).toFixed(4)}, {Number(selectedReport.longitude).toFixed(4)}</span>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${Number(selectedReport.latitude)},${Number(selectedReport.longitude)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-bold underline"
                >
                  View App
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
