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

    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }))
        setGettingLocation(false)
      },
      () => {
        setError('Failed to get location')
        setGettingLocation(false)
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
        title: '🚨 Incident submitted',
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

            <Input
              label="Title *"
              placeholder="Brief title of the incident"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <p className={`-mt-4 text-xs ${formData.title.trim().length >= MIN_TITLE_LEN ? 'text-green-600' : 'text-gray-500'}`}>
              {formData.title.trim().length}/{MIN_TITLE_LEN}+ characters
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                placeholder="Describe the incident in detail (AI will analyze this)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none h-32 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
              <p className={`mt-1 text-xs ${formData.description.trim().length >= MIN_DESC_LEN ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.description.trim().length}/{MIN_DESC_LEN}+ characters
              </p>
              <p className="mt-1 text-xs text-gray-500">Tip: include what happened, severity, and nearby landmarks.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="flex flex-col items-center justify-center w-full h-32 px-4 transition-all duration-200 bg-white border-2 border-gray-300 border-dashed rounded-xl cursor-pointer hover:border-primary-500 hover:bg-primary-50 hover:shadow-sm"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className="p-3 bg-primary-50 rounded-full group-hover:bg-primary-100 transition-colors">
                        <ImagePlus className="w-6 h-6 text-primary-500" />
                      </div>
                      <span className="font-medium text-gray-600">
                        Click to upload <span className="text-gray-400 font-normal">or drag and drop</span>
                      </span>
                      <span className="text-xs text-gray-400">SVG, PNG, JPG or GIF (max. 5MB)</span>
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
            <p className="text-sm font-medium text-blue-800 mt-1 mb-4 text-center bg-blue-50 py-2.5 rounded border border-blue-100 shadow-sm">
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>✨ AI-Powered:</strong> Our AI will automatically categorize your report and assign a priority
                score based on the description you provide.
              </p>
            </div>

            <Button type="submit" size="lg" isLoading={loading} className="w-full">
              {loading ? 'Submitting...' : '📤 Submit Report'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
