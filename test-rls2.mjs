import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
let url, key;
lines.forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) key = l.split('=')[1].trim();
});

async function run() {
  try {
    const usersReq = await fetch(`${url}/rest/v1/users?select=*&role=eq.admin`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log('Admins:', await usersReq.json());

    const reportsReq = await fetch(`${url}/rest/v1/reports?select=*,assignments(*)`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const reports = await reportsReq.json();
    console.log('Reports count:', reports.length);
    if(reports.length > 0) {
      console.log('Sample report id:', reports[0].id);
      console.log('Assignments count for sample:', reports[0].assignments.length);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
