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
  uploadImage: async (bucket: string, path: string, file: File | Blob, mimeType: string = 'image/jpeg') => {
    const UPLOAD_TIMEOUT = 50000;
    const MAX_RETRIES = 3;
    let attempt = 0;

    // Detect MIME type if not provided
    const contentType = file instanceof File ? file.type || mimeType : mimeType;
    const fileSize = file.size;

    console.log(`[Storage] Uploading to ${bucket}/${path}`, {
      size: fileSize,
      type: contentType,
      isFile: file instanceof File,
      isBlob: file instanceof Blob
    });

    // Already a Blob or is a File (which extends Blob)
    const uploadBody = file;

    // Try upload with retries and random jitter to avoid repeated failures
    while (attempt <= MAX_RETRIES) {
      try {
        console.log(`[Storage] Attempt ${attempt + 1}/${MAX_RETRIES + 1}`);

        const uploadPromise = supabase.storage
          .from(bucket)
          .upload(path, uploadBody, {
            contentType: contentType,
            upsert: false,
          });

        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error(`Upload timeout after ${UPLOAD_TIMEOUT}ms`)), UPLOAD_TIMEOUT)
        );

        const result = await Promise.race([uploadPromise, timeoutPromise]);

        if (result.error) {
          const errMsg = result.error.message || String(result.error);
          console.error(`[Storage] SDK error on attempt ${attempt + 1}:`, errMsg);
          
          // If ERR_UPLOAD_FILE_CHANGED, wait longer before retry
          if (errMsg.includes('ERR_UPLOAD_FILE_CHANGED') && attempt < MAX_RETRIES) {
            attempt++;
            // Use exponential + random jitter: 3-5s, 6-10s, 12-20s
            const baseWait = 1000 * Math.pow(2, attempt);
            const jitter = Math.random() * 2000;
            const waitTime = baseWait + jitter;
            console.warn(`[Storage] File changed error (mobile issue). Retrying in ${Math.round(waitTime)}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          throw result.error;
        }

        console.log(`[Storage] Upload successful:`, result.data);
        return { data: result.data, error: null };

      } catch (err: any) {
        const errorMessage = err.message || String(err);
        const isRetryableError = 
          errorMessage.includes('fetch') ||
          errorMessage.includes('Network') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('Failed') ||
          errorMessage.includes('ERR_') ||
          errorMessage.includes('NETWORK') ||
          errorMessage.includes('StorageUnknownError');

        if (isRetryableError && attempt < MAX_RETRIES) {
          attempt++;
          // For temporary errors: 2s + jitter, 4s + jitter, 8s + jitter
          const baseWait = 1000 * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 1000;
          const waitTime = baseWait + jitter;
          console.warn(`[Storage] Attempt ${attempt} failed (${errorMessage}). Retrying in ${Math.round(waitTime)}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        console.warn(`[Storage] Non-retryable error or max retries reached: ${errorMessage}`);
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
