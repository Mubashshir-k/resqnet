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
    const UPLOAD_TIMEOUT = 30000; // 30 seconds for mobile networks
    const MAX_RETRIES = 2;
    let sdkAttempt = 0;

    console.log(`[Storage] Uploading to ${bucket}/${path}`, {
      size: file.size,
      type: file.type,
      name: file.name
    });

    // Convert File to ArrayBuffer to prevent mobile file stream issues
    let fileBody: ArrayBuffer | File = file;
    try {
      fileBody = await file.arrayBuffer();
      console.log(`[Storage] Successfully converted file to ArrayBuffer (${fileBody.byteLength} bytes)`);
    } catch (readErr: any) {
      console.warn(`[Storage] Failed to convert to ArrayBuffer, falling back to File object:`, readErr);
      fileBody = file;
    }

    // Phase 1: Use Supabase SDK (most reliable on mobile)
    while (sdkAttempt <= MAX_RETRIES) {
      try {
        const uploadBody = fileBody instanceof ArrayBuffer 
          ? new Blob([fileBody], { type: file.type }) 
          : fileBody;

        console.log(`[Storage] Supabase SDK upload attempt ${sdkAttempt + 1}/${MAX_RETRIES + 1}`);

        // Wrap sdk call with timeout
        const uploadPromise = supabase.storage
          .from(bucket)
          .upload(path, uploadBody, {
            contentType: file.type,
            upsert: false,
          });

        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Upload timeout after 30s')), UPLOAD_TIMEOUT)
        );

        const result = await Promise.race([uploadPromise, timeoutPromise]);

        if (result.error) {
          const isNetworkError = 
            result.error.message?.includes('Failed to fetch') ||
            result.error.message?.includes('Network') ||
            result.error.message?.includes('timeout');

          if (isNetworkError && sdkAttempt < MAX_RETRIES) {
            sdkAttempt++;
            const waitTime = 2000 * sdkAttempt;
            console.warn(`[Storage] Network error on SDK attempt ${sdkAttempt}. Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          throw result.error;
        }

        console.log(`[Storage] Supabase SDK upload successful:`, result.data);
        return { data: result.data, error: null };

      } catch (err: any) {
        const isNetworkError = 
          err.message?.includes('fetch') ||
          err.message?.includes('Network') ||
          err.message?.includes('timeout');

        if (isNetworkError && sdkAttempt < MAX_RETRIES) {
          sdkAttempt++;
          const waitTime = 2000 * sdkAttempt;
          console.warn(`[Storage] Network exception on SDK attempt ${sdkAttempt}. Retrying in ${waitTime}ms...`, err.message);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        console.warn(`[Storage] Supabase SDK failed after ${sdkAttempt + 1} attempts:`, err.message);
        break; // Move to fallback
      }
    }

    // Phase 2: Fallback to FormData-based direct fetch (for extra resilience on mobile)
    console.log(`[Storage] SDK exhausted. Attempting FormData fallback...`);

    try {
      const uploadBody = fileBody instanceof ArrayBuffer 
        ? new Blob([fileBody], { type: file.type }) 
        : fileBody;

      const formData = new FormData();
      formData.append('file', uploadBody);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

      console.log(`[Storage] FormData fallback attempt to ${url}`);

      const fetchPromise = fetch(url, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token || supabaseAnonKey}`,
          'x-upsert': 'false',
        },
        body: formData // FormData handles multipart encoding
      });

      const timeoutPromise = new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout after 30s')), UPLOAD_TIMEOUT)
      );

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }

        const status = response.status;
        const statusText = response.statusText;

        console.error(`[Storage] FormData fallback failed - HTTP ${status}: ${statusText}`, errorData);
        return {
          data: null,
          error: { message: `Upload failed (HTTP ${status}): ${errorData.message || errorData.error || statusText}` } as any
        };
      }

      const data = await response.json();
      console.log(`[Storage] FormData fallback successful:`, data);
      return { data, error: null };

    } catch (err: any) {
      console.error(`[Storage] FormData fallback failed:`, err);
      return { 
        data: null, 
        error: { message: `Storage Error: ${err.message || 'Unknown error'}. Your phone might be blocking the connection or using an old version of the app.` } as any 
      };
    }
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
