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
  const { data, error } = await adminClient.from('users').select('*');
  console.log("ALL USERS:", data);
  if (error) console.error(error);
  
  const admins = data.filter(u => u.role === 'admin');
  console.log("ADMINS:", admins);
}
check().catch(console.error);
