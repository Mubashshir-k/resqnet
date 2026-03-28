import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
let url, serviceKey;
lines.forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = l.split('=')[1].trim();
});

const adminClient = createClient(url, serviceKey);

async function check() {
  const { data, error } = await adminClient.rpc('is_admin');
  if (error) {
    if (error.message.includes('Could not find the function')) {
      console.log('CRITICAL: is_admin DOES NOT EXIST in Supabase!');
    } else {
      console.log('RPC Error:', error);
    }
  } else {
    console.log('is_admin EXISTS and returned:', data);
  }
}
check().catch(console.error);
