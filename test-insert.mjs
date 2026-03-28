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
  const email = 'testinsert_rls@example.com';
  const password = 'testpassword123';
  
  console.log("1. Creating test insert user via Admin API...");
  await adminClient.auth.admin.createUser({ email, password, email_confirm: true });
  
  const { data: authData } = await adminClient.auth.admin.listUsers();
  const uid = authData.users.find(u => u.email === email)?.id;
  
  if (uid) {
    await adminClient.from('users').upsert({ id: uid, email, name: 'Test Insert User', role: 'user' });
  }
  
  console.log("2. Signing in as test user via Public API...");
  const { error: signInError } = await publicClient.auth.signInWithPassword({ email, password });
  if (signInError) { console.error("Sign-in failed:", signInError); return; }
  
  console.log("3. Attempting to insert a report...");
  const reportData = {
    user_id: uid,
    title: 'Test Incident',
    description: 'This is a test report',
    category: 'other',
    latitude: 18.5,
    longitude: 73.8,
    priority_score: 50,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { data, error: insertError } = await publicClient.from('reports').insert([reportData]);
  
  if (insertError) {
    console.error("🔥 RLS INSERT ERROR:", insertError);
  } else {
    console.log(`✅ Success! Inserted report.`);
  }
  
  // Cleanup
  if (uid) {
    await adminClient.auth.admin.deleteUser(uid);
    await adminClient.from('reports').delete().eq('user_id', uid);
  }
}
run();
