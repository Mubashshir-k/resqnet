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

const publicClient = createClient(url, anonKey);

async function testConnectivity() {
  console.log("1. Starting ping test to Supabase Anon API...");
  const startPing = Date.now();
  const { data: ping, error: pingError } = await publicClient.from('reports').select('id').limit(1);
  if (pingError) {
    console.error(`💥 Ping Failed in ${Date.now() - startPing}ms:`, pingError);
  } else {
    console.log(`✅ Ping Succeeded in ${Date.now() - startPing}ms`);
  }

  console.log("2. Simulating User Profile Fetch (the part that runs after sign-in)...");
  const startProfile = Date.now();
  // Using a random UUID that doesn't exist just to test response time
  const { data: profile, error: profileError } = await publicClient.from('users').select().eq('id', '00000000-0000-0000-0000-000000000000').maybeSingle();
  
  if (profileError) {
    console.error(`💥 Fetch Failed in ${Date.now() - startProfile}ms:`, profileError);
  } else {
    console.log(`✅ Fetch Succeeded in ${Date.now() - startProfile}ms`);
  }
}
testConnectivity();
