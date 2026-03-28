export type UserRole = 'user' | 'volunteer' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  created_at: string
}

export interface Report {
  id: string
  user_id: string
  title: string
  description: string
  image_url?: string
  latitude: number
  longitude: number
  category: 'fire' | 'medical' | 'accident' | 'flood' | 'other'
  priority_score: number
  status: 'pending' | 'assigned' | 'resolved'
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  report_id: string
  volunteer_id: string
  status: 'pending' | 'accepted' | 'completed' | 'rejected'
  updated_at: string
}

export interface AIAnalysisResult {
  category: 'fire' | 'medical' | 'accident' | 'flood' | 'other'
  priority_score: number
  reason: string
}
