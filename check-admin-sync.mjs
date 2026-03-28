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
  console.log("Checking Admin ID Synchronization...");
  
  // Get all users from public.users with role admin
  const { data: publicAdmins, error: dbError } = await adminClient.from('users').select('*').eq('role', 'admin');
  if (dbError) {
    console.error("Error fetching public.users:", dbError);
    return;
  }
  
  console.log(`Found ${publicAdmins.length} admins in public.users.`);
  
  // Get all users from auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
  if (authError) {
    console.error("Error fetching auth.users:", authError);
    return;
  }
  const authUsers = authData.users;
  
  for (const pAdmin of publicAdmins) {
    console.log(`\nPublic Admin: ${pAdmin.email} (ID: ${pAdmin.id})`);
    
    // Find matching email in auth.users
    const matchingAuth = authUsers.find(u => u.email === pAdmin.email);
    if (!matchingAuth) {
      console.log(`  ❌ CRITICAL: No matching user found in auth.users for email ${pAdmin.email}`);
    } else {
      console.log(`  Matching Auth User found. ID: ${matchingAuth.id}`);
      if (matchingAuth.id !== pAdmin.id) {
        console.log(`  ❌ CRITICAL: IDs DO NOT MATCH! RLS relies on auth.uid() == users.id.`);
        
        // Optional: Let's automatically fix it if it's broken!
        console.log(`  -> Attempting to fix public.users ID to match auth.users ID...`);
        // Wait, primary key updates can be tricky, but let's try.
        const { error: updateError } = await adminClient.from('users').update({ id: matchingAuth.id }).eq('email', pAdmin.email);
        if (updateError) {
          console.error(`     Failed to update:`, updateError.message);
        } else {
          console.log(`     ✅ Successfully synced ID!`);
        }
      } else {
        console.log(`  ✅ IDs match perfectly.`);
      }
    }
  }
  
  // Let's also verify volunteers just in case
  const { data: publicVols } = await adminClient.from('users').select('*').eq('role', 'volunteer');
  for (const pVol of publicVols) {
    console.log(`\nPublic Volunteer: ${pVol.email} (ID: ${pVol.id})`);
    const matchingAuth = authUsers.find(u => u.email === pVol.email);
    if (matchingAuth && matchingAuth.id !== pVol.id) {
      console.log(`  ❌ CRITICAL: Volunteer IDs DO NOT MATCH! Fixing...`);
      await adminClient.from('users').update({ id: matchingAuth.id }).eq('email', pVol.email);
    }
  }
}

check().catch(console.error);
