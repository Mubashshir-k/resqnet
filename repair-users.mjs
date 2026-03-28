import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
let url, serviceKey;
lines.forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = l.split('=')[1].trim();
});

const supabase = createClient(url, serviceKey);

async function repairUsers() {
  console.log("🛠️ Starting User Role Normalization...");
  
  // 1. Normalize all roles in public.users to lowercase
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, email, role');

  if (fetchError) {
    console.error("Error fetching users:", fetchError);
    return;
  }

  for (const user of users) {
    const normalizedRole = user.role ? user.role.trim().toLowerCase() : 'user';
    if (user.role !== normalizedRole) {
      console.log(`Updating user ${user.email}: ${user.role} -> ${normalizedRole}`);
      await supabase
        .from('users')
        .update({ role: normalizedRole })
        .eq('id', user.id);
    }
  }

  console.log("✅ Normalization complete.");
  console.log("Check the Admin Dashboard again.");
}

repairUsers();
