import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Create admin client
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log('--- ADMIN CHECK ---');
  // Find users with role admin
  const { data: admins } = await adminClient.from('users').select('*').eq('role', 'admin');
  console.log('Admins found:', admins);

  // Get reports
  const { data: reports } = await adminClient.from('reports').select('id, title, status, assignments(*)');
  console.log('Reports found:', JSON.stringify(reports, null, 2));

  // Let's test if the assignment table actually has the delete policy
  // We can fetch the policies via RPC or by checking the admin
}

test().catch(console.error);
