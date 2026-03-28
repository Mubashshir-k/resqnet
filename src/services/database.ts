import { supabase } from './supabase'
import { User, Report, Assignment } from '@/types'

// Users
export const usersService = {
  create: async (user: Omit<User, 'created_at'>) => {
    // Use upsert to prevent unique constraint violations on retry
    const { error } = await supabase.from('users').upsert([user], { onConflict: 'id' })
    return { data: user, error }
  },

  getById: async (id: string) => {
    const { data, error } = await supabase.from('users').select().eq('id', id).maybeSingle()
    return { data, error }
  },

  getByEmail: async (email: string) => {
    const { data, error } = await supabase.from('users').select().eq('email', email).maybeSingle()
    return { data, error }
  },

  updateRole: async (id: string, role: string) => {
    const { data, error } = await supabase.from('users').update({ role }).eq('id', id).select()
    return { data, error }
  },

  getAllVolunteers: async () => {
    // Filter by role at the database level for efficiency and RLS compatibility
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('role', 'volunteer')
      .order('name')
    return { data, error }
  },

  getAllVisibleUsers: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },
}

// Reports
export const reportsService = {
  create: async (report: Omit<Report, 'id' | 'created_at' | 'updated_at'>) => {
    // Always use the current auth uid for RLS (auth.uid() must equal user_id).
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) return { data: null, error: authError }
    const authUserId = authData.user?.id
    if (!authUserId) return { data: null, error: new Error('Not authenticated') as any }

    const reportData = {
      ...report,
      user_id: authUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('reports').insert([reportData]).select('id').maybeSingle()
    return { data: data ? { ...reportData, id: (data as any).id } : reportData, error }
  },

  getAll: async () => {
    const { data, error } = await supabase.from('reports').select().order('created_at', { ascending: false })
    return { data, error }
  },

  getById: async (id: string) => {
    const { data, error } = await supabase.from('reports').select().eq('id', id).maybeSingle()
    return { data, error }
  },

  getByUserId: async (userId: string) => {
    const { data, error } = await supabase
      .from('reports')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  getByPriority: async (minPriority: number) => {
    const { data, error } = await supabase
      .from('reports')
      .select()
      .gte('priority_score', minPriority)
      .eq('status', 'pending')
      .order('priority_score', { ascending: false })
    return { data, error }
  },

  updateStatus: async (id: string, status: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    return { data: null, error }
  },

  delete: async (id: string) => {
    const { data, error, count } = await supabase
      .from('reports')
      .delete({ count: 'exact' })
      .eq('id', id)
      .select('id')

    if (error) {
      console.error('Supabase delete error:', error)
    }
    return { data, error, count: count ?? 0 }
  },
}

// Assignments
export const assignmentsService = {
  create: async (assignment: Omit<Assignment, 'id' | 'updated_at'>) => {
    const assignmentData = { ...assignment, updated_at: new Date().toISOString() }
    const { error } = await supabase
      .from('assignments')
      .insert([assignmentData])
    return { data: assignmentData, error }
  },

  getByVolunteerId: async (volunteerId: string) => {
    const { data, error } = await supabase
      .from('assignments')
      .select(`*, reports(*)`)
      .eq('volunteer_id', volunteerId)
      .order('updated_at', { ascending: false })
    return { data, error }
  },

  getByReportId: async (reportId: string) => {
    const { data, error } = await supabase
      .from('assignments')
      .select()
      .eq('report_id', reportId)
      .maybeSingle()
    return { data, error }
  },

  updateStatus: async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('assignments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    return { data, error }
  },
}

// Storage
export const storageService = {
  uploadImage: async (bucket: string, path: string, file: File) => {
    const MAX_RETRIES = 2;
    let attempt = 0;

    console.log(`[Storage] Uploading to ${bucket}/${path}`, {
      size: file.size,
      type: file.type,
      name: file.name
    });

    // Strategy 1: Convert File to ArrayBuffer immediately.
    // This is the most reliable way on mobile browsers as it prevents
    // the "file could not be read" error caused by losing the file stream/reference.
    let fileBody: ArrayBuffer | File = file;
    try {
      fileBody = await file.arrayBuffer();
      console.log(`[Storage] Successfully converted file to ArrayBuffer (${fileBody.byteLength} bytes)`);
    } catch (readErr: any) {
      console.warn(`[Storage] Failed to convert to ArrayBuffer, falling back to File object:`, readErr);
      // Fallback to the original File object if conversion fails for some reason
      fileBody = file;
    }

    while (attempt <= MAX_RETRIES) {
      try {
        // Strategy 2: Wrap body in a fresh Blob. 
        // This is highly compatible and ensures content-type is matched properly.
        const uploadBody = fileBody instanceof ArrayBuffer ? new Blob([fileBody], { type: file.type }) : fileBody;

        const { data, error } = await supabase.storage.from(bucket).upload(path, uploadBody, { 
          upsert: false, // Disabling upsert simplifies the request (removes pre-flight checks)
          contentType: file.type,
          cacheControl: '3600',
          // duplex: 'half' is NOT used here as it causes issues on many mobile browsers.
        })

        if (error) {
          // If it's a network/fetch error, we retry up to MAX_RETRIES
          const isFetchError = error.message?.includes('fetch') || error.message?.includes('Network');
          if (isFetchError && attempt < MAX_RETRIES) {
            attempt++;
            console.warn(`[Storage] Attempt ${attempt} failed with network error. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1500 * attempt)); 
            continue;
          }
          console.error(`[Storage] Upload failed for ${bucket}/${path}:`, error);
          return { data, error }
        }

        console.log(`[Storage] Upload successful for ${bucket}/${path}`, data);
        return { data, error }
      } catch (err: any) {
        const isFetchError = err.message?.includes('fetch') || err.message?.includes('Network');
        if (isFetchError && attempt < MAX_RETRIES) {
          attempt++;
          console.warn(`[Storage] Attempt ${attempt} caught exception. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
          continue;
        }
        console.error(`[Storage] Unexpected error during upload to ${bucket}/${path}:`, err);
        return { data: null, error: err }
      }
    }
    
    return { data: null, error: new Error('Upload failed after multiple retries') as any }
  },

  getPublicUrl: (bucket: string, path: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  },

  deleteImage: async (bucket: string, path: string) => {
    const { error } = await supabase.storage.from(bucket).remove([path])
    return { error }
  },
}

// Realtime Subscriptions
export const realtimeService = {
  subscribeToReports: (
    callback: (payload: any) => void,
    statusCallback?: (status: string, error?: Error) => void
  ) => {
    const channelName = 'reports-' + Math.random().toString(36).substring(7)
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) =>
        callback(payload)
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[realtime:${channelName}] reports subscription failed`, status, err)
        }
        statusCallback?.(status, err)
      })
    return subscription
  },

  subscribeToAssignments: (
    volunteerId: string,
    callback: (payload: any) => void,
    statusCallback?: (status: string, error?: Error) => void
  ) => {
    const channelName = `assignments-${volunteerId}-${Math.random().toString(36).substring(7)}`
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, (payload: any) => {
        // payload.new is null/empty on DELETE events. 
        // Trigger a re-fetch on any DELETE (to be safe) or if the modified assignment belongs to this volunteer.
        if (payload.eventType === 'DELETE' || (payload.new && payload.new.volunteer_id === volunteerId)) {
          callback(payload)
        }
      })
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[realtime:${channelName}] assignments subscription failed`, status, err)
        }
        statusCallback?.(status, err)
      })
    return subscription
  },
}
