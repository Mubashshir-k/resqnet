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
    const UPLOAD_TIMEOUT = 50000;
    const MAX_RETRIES = 5;
    let attempt = 0;

    console.log(`[Storage] Uploading to ${bucket}/${path}`, {
      size: file.size,
      type: file.type,
      name: file.name
    });

    // Convert File to Blob IMMEDIATELY to avoid ERR_UPLOAD_FILE_CHANGED on mobile
    // File objects become stale on mobile after form operations
    let uploadBody: Blob;
    try {
      uploadBody = new Blob([file], { type: file.type });
      console.log(`[Storage] Converted File to Blob immediately (${uploadBody.size} bytes)`);
    } catch (err: any) {
      console.error(`[Storage] Failed to create Blob:`, err);
      uploadBody = file as any;
    }

    // Try upload with retries
    while (attempt <= MAX_RETRIES) {
      try {
        console.log(`[Storage] Attempt ${attempt + 1}/${MAX_RETRIES + 1} - Using Supabase SDK`);

        const uploadPromise = supabase.storage
          .from(bucket)
          .upload(path, uploadBody, {
            contentType: file.type,
            upsert: false,
          });

        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error(`Upload timeout after ${UPLOAD_TIMEOUT}ms`)), UPLOAD_TIMEOUT)
        );

        const result = await Promise.race([uploadPromise, timeoutPromise]);

        if (result.error) {
          console.error(`[Storage] SDK error on attempt ${attempt + 1}:`, result.error);
          throw result.error;
        }

        console.log(`[Storage] Upload successful:`, result.data);
        return { data: result.data, error: null };

      } catch (err: any) {
        const errorMessage = err.message || String(err);
        const isNetworkError = 
          errorMessage.includes('fetch') ||
          errorMessage.includes('Network') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('Failed') ||
          errorMessage.includes('ERR_UPLOAD_FILE_CHANGED') ||
          errorMessage.includes('NETWORK_ERROR') ||
          errorMessage.includes('StorageUnknownError');

        if (isNetworkError && attempt < MAX_RETRIES) {
          attempt++;
          // Exponential backoff: 2s, 4s, 8s, 16s, 32s
          const waitTime = 1000 * Math.pow(2, attempt - 1);
          console.warn(`[Storage] Attempt ${attempt} failed (${errorMessage}). Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        console.warn(`[Storage] All retries exhausted. Final error: ${errorMessage}`);
        break;
      }
    }

    // If all attempts fail, return clear error
    console.error(`[Storage] Upload final failure after ${MAX_RETRIES + 1} attempts`);
    return {
      data: null,
      error: {
        message: `Storage Error: Image upload failed after multiple attempts. Please check your internet connection and try again.`
      } as any
    };
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
