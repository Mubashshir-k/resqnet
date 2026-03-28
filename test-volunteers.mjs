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
    const usersReq = await fetch(`${url}/rest/v1/users?select=*`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const users = await usersReq.json();
    console.log('All Users Total:', users.length);
    const vols = users.filter(u => u.role === 'volunteer');
    console.log('Volunteers:', vols.length);
    console.log(vols.map(v => v.email));
  } catch (e) {
    console.error(e);
  }
}
run();
