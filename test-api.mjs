import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
let url, serviceKey, anonKey;
lines.forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) anonKey = l.split('=')[1].trim();
});

const adminClient = createClient(url, serviceKey);
const publicClient = createClient(url, anonKey);

async function run() {
  const email = 'testadmin_rls@example.com';
  const password = 'testpassword123';
  
  console.log("1. Creating test admin user via Admin API...");
  // Create user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (authError && !authError.message.includes('already exists')) {
    console.error("Auth Error:", authError);
    return;
  }
  
  const uid = authData?.user?.id;
  if (uid) {
    console.log("2. Setting user role to 'admin' in public.users...");
    await adminClient.from('users').upsert({
      id: uid,
      email: email,
      name: 'Test Admin',
      role: 'admin'
    });
  }
  
  console.log("3. Signing in as test admin via Public API...");
  const { data: sessionData, error: signInError } = await publicClient.auth.signInWithPassword({
    email,
    password
  });
  if (signInError) {
    console.error("Sign-in failed:", signInError);
    return;
  }
  
  console.log("4. Fetching volunteers using Admin anon JWT...");
  const { data: vols, error: fetchError } = await publicClient.from('users').select('*').eq('role', 'volunteer');
  
  if (fetchError) {
    console.error("🔥 RLS FETCH ERROR:", fetchError);
  } else {
    console.log(`✅ Success! Found ${vols.length} volunteers.`);
    console.log(vols);
  }
  
  // Cleanup
  if (uid) {
    await adminClient.auth.admin.deleteUser(uid);
  }
}
run();
