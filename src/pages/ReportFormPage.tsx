import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/Header'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Card from '@/components/Card'
import { useAuthStore } from '@/store/authStore'
import { reportsService, storageService } from '@/services/database'
import { analyzeDisasterReport } from '@/services/openai'
import { MapPin, ImagePlus, X } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { notifyPopup } from '@/utils/notifications'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const markerIcon = L.divIcon({
  html: `<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transform: translate(-50%, -50%);"></div>`,
  className: 'custom-leaflet-marker',
  iconSize: [20, 20],
  iconAnchor: [0, 0],
})

function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng.lat, e.latlng.lng)
    },
  })

  // Smoothly center the map when location updates via GPS (ignoring 0,0 default)
  useEffect(() => {
    if (position[0] !== 0 && position[1] !== 0) {
      map.setView(position, map.getZoom() < 12 ? 14 : map.getZoom())
    }
  }, [position, map])

  return position[0] !== 0 || position[1] !== 0 ? (
    <Marker position={position} icon={markerIcon} />
  ) : null
}

export default function ReportFormPage() {
  const MIN_TITLE_LEN = 5
  const MIN_DESC_LEN = 20
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    latitude: 0,
    longitude: 0,
  })
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gettingLocation, setGettingLocation] = useState(false)

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported')
      return
    }

    // Check if we're on a secure context
    if (!window.isSecureContext) {
      setError('Location requires HTTPS. Try refreshing or using desktop (localhost:3001).')
      return
    }

    setGettingLocation(true)
    console.log('[ReportForm] Requesting GPS location with 10s timeout...')
    
    let watchId: number | null = null
    
    // Set a timeout to fail fast if GPS is taking too long
    const timeoutId = setTimeout(() => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
      setError('Location request timed out. Please try again or click on the map.')
      setGettingLocation(false)
    }, 10000)
    
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        clearTimeout(timeoutId)
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId)
        }
        console.log('[ReportForm] GPS location acquired:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }))
        setGettingLocation(false)
        setError('')
      },
      (error) => {
        clearTimeout(timeoutId)
        let errorMsg = 'Failed to get location'
        
        if (error.code === error.PERMISSION_DENIED) {
          // Check if it's a secure origin issue
          if (error.message?.includes('secure origin')) {
            errorMsg = 'Location requires HTTPS. Try refreshing the page or use desktop: https://localhost:3001'
          } else {
            errorMsg = 'Location permission denied. Enable location access in settings and try again.'
          }
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location unavailable. Try clicking on the map to select location manually.'
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out. Try clicking on the map instead.'
        }
        
        console.warn('[ReportForm] Geolocation error:', { code: error.code, message: error.message, isSecureContext: window.isSecureContext })
        setError(errorMsg)
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('[ReportForm] Starting submission...');

      // 1. Double-check authentication state
      const { data: { user: currentUser }, error: authCheckError } = await useAuthStore.getState().checkAuth().then(() => ({ data: { user: useAuthStore.getState().user }, error: null }));
      if (authCheckError) console.warn('[ReportForm] Auth check error:', authCheckError);
      
      const sessionUser = currentUser || user;
      if (!sessionUser) {
        console.error('[ReportForm] No authenticated user found');
        throw new Error('Not authenticated. Please login again.');
      }

      console.log('[ReportForm] User authenticated:', sessionUser.id);

      // 2. Form validation
      if (!formData.title || !formData.description) {
        throw new Error('Please fill in all required fields')
      }
      if (formData.title.trim().length < MIN_TITLE_LEN) {
        throw new Error(`Title must be at least ${MIN_TITLE_LEN} characters`)
      }
      if (formData.description.trim().length < MIN_DESC_LEN) {
        throw new Error(`Description must be at least ${MIN_DESC_LEN} characters`)
      }

      // 3. AI Analysis
      console.log('[ReportForm] Requesting AI analysis...');
      const aiResult = await analyzeDisasterReport(formData.description)
      console.log('[ReportForm] AI analysis complete:', aiResult);

      // 4. Image Upload
      let imageUrl = ''
      if (image) {
        console.log('[ReportForm] Image details:', {
          name: image.name,
          size: image.size,
          type: image.type,
          instanceOfFile: image instanceof File,
          instanceOfBlob: image instanceof Blob
        });

        const timestamp = Date.now()
        const cleanFileName = image.name.replace(/[^a-zA-Z0-9.]/g, '_');
        // Structure: reports/public/{user_id}/{timestamp}-{filename}
        const path = `public/${sessionUser.id}/${timestamp}-${cleanFileName}`;
        
        console.log(`[ReportForm] Attempting image upload to: ${path}`);
        
        // Final attempt at making this bulletproof: Catch the error and display more context
        const { error: uploadError } = await storageService.uploadImage('reports', path, image);
        
        if (uploadError) {
          console.error('[ReportForm] Storage upload failed error object:', uploadError);
          const errorMsg = uploadError.message || 'Unknown Storage Error';
          throw new Error(`Storage Error: ${errorMsg}. Your phone might be blocking the connection or using an old version of the app. Look for v0.1.5 in the header!`);
        }
        
        imageUrl = storageService.getPublicUrl('reports', path)
        console.log('[ReportForm] Image upload successful, URL:', imageUrl);
      }

      // 5. Database Record Creation
      console.log('[ReportForm] Creating report entry in database...');
      const { error: createError } = await reportsService.create({
        user_id: sessionUser.id,
        title: formData.title,
        description: formData.description,
        image_url: imageUrl,
        latitude: formData.latitude,
        longitude: formData.longitude,
        category: aiResult.category,
        priority_score: aiResult.priority_score,
        status: 'pending',
      })

      if (createError) {
        console.error('[ReportForm] Database creation failed:', createError);
        throw new Error(`Database Error: ${createError.message}. Your image was uploaded, but the report details could not be saved.`);
      }

      console.log('[ReportForm] Submission successful, redirecting...');
      notifyPopup({
        title: 'Incident submitted',
        message: 'Your report was sent to the response team.',
        variant: 'success',
      })
      navigate('/my-reports')
    } catch (err: any) {
      console.error('[ReportForm] Caught error during submission:', err);
      setError(err.message || 'Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report an Incident</h1>
          <p className="text-gray-600 mb-8">Provide details so we can help quickly</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Details Section */}
            <div className="space-y-6">
              <div>
                <Input
                  label="Title *"
                  placeholder="Brief title of the incident"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
                <p className={`mt-1.5 text-[11px] font-medium ${formData.title.trim().length >= MIN_TITLE_LEN ? 'text-green-600' : 'text-gray-400'}`}>
                  {formData.title.trim().length}/{MIN_TITLE_LEN}+ characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  placeholder="Describe the incident in detail (AI will analyze this)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-200 resize-none h-32 bg-white dark:bg-slate-900/50 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <p className={`text-[11px] font-medium ${formData.description.trim().length >= MIN_DESC_LEN ? 'text-green-600' : 'text-gray-400'}`}>
                    {formData.description.trim().length}/{MIN_DESC_LEN}+ characters
                  </p>
                  <p className="text-[11px] text-gray-400 italic font-medium">✨ Tip: include severity and nearby landmarks.</p>
                </div>
              </div>
            </div>

            {/* Media Section */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Image (Optional)
              </label>
              <div className="relative group">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {!image ? (
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-36 px-4 transition-all duration-300 bg-slate-50/50 dark:bg-slate-900/30 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-2xl cursor-pointer hover:border-primary-400 hover:bg-white dark:hover:bg-slate-900/50 group/upload"
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group-hover/upload:scale-110 transition-transform duration-300">
                        <ImagePlus className="w-6 h-6 text-primary-500" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-700 dark:text-gray-300 tracking-tight">Click to upload <span className="text-gray-400 font-normal underline decoration-slate-200 underline-offset-4">image</span></p>
                        <p className="text-[11px] text-gray-400 mt-1 uppercase font-bold tracking-widest leading-none">SVG, PNG, JPG (max 5mb)</p>
                      </div>
                    </div>
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-white border-2 border-primary-200 shadow-sm rounded-xl">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2 bg-primary-50 rounded-lg shrink-0">
                        <ImagePlus className="w-5 h-5 text-primary-500" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-gray-900 truncate">{image.name}</span>
                        <span className="text-xs text-gray-500">{(image.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                      title="Remove image"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Latitude *"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                required
              />
              <Input
                label="Longitude *"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div className="h-[250px] md:h-[400px] w-full rounded-lg overflow-hidden border border-gray-200 z-0 relative shadow-inner">
              <MapContainer 
                center={[20.5937, 78.9629]} 
                zoom={4} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; Google Maps'
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                />
                <LocationMarker 
                  position={[formData.latitude, formData.longitude]}
                  setPosition={(lat, lng) => setFormData(p => ({ ...p, latitude: lat, longitude: lng }))}
                />
              </MapContainer>
            </div>
            <p className="text-xs font-semibold text-gray-400/80 mt-2 mb-6 text-center italic tracking-tight">
              👉 Click anywhere on the map above to select your exact location
            </p>

            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2"
              onClick={handleGetLocation}
              disabled={gettingLocation}
            >
              <MapPin size={18} />
              {gettingLocation ? 'Getting Location...' : 'Use Current Location'}
            </Button>

            <div className="pb-4">
              <p className="text-xs text-gray-400/80 leading-relaxed font-medium">
                <span className="text-gray-600/90 font-bold tracking-tight">✨ AI-Powered:</span> Our AI will automatically categorize your report and assign a priority
                score based on the description you provide.
              </p>
            </div>

            <Button type="submit" size="lg" isLoading={loading} className="w-full !rounded-2xl shadow-lg shadow-primary-500/20 py-4 font-black tracking-tight text-lg">
              {loading ? 'Submitting...' : '🚀 Submit Report'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
