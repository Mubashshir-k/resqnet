import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
let url, key;
lines.forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) key = l.split('=')[1].trim();
});

const client = createClient(url, key);

async function check() {
  let output = '';
  const { data: users, error: userError } = await client.from('users').select('email, role, id');
  if (userError) {
    output += `Error fetching users: ${JSON.stringify(userError)}\n`;
  } else {
    output += '--- USERS ---\n';
    users.forEach(u => output += `${u.email}: ${u.role} (${u.id})\n`);
  }

  const { data: reports, error: reportError } = await client.from('reports').select('*');
  if (reportError) {
    output += `\nError fetching reports: ${JSON.stringify(reportError)}\n`;
  } else {
    output += '\n--- REPORTS ---\n';
    reports.forEach(r => output += `${r.id}: ${r.title} [${r.status}] (User: ${r.user_id})\n`);
  }

  const { data: assignments, error: assignmentError } = await client.from('assignments').select('*');
  if (assignmentError) {
    output += `\nError fetching assignments: ${JSON.stringify(assignmentError)}\n`;
  } else {
    output += '\n--- ASSIGNMENTS ---\n';
    assignments.forEach(a => output += `${a.id}: Report ${a.report_id} -> Volunteer ${a.volunteer_id} [${a.status}]\n`);
  }

  fs.writeFileSync('diag_output.txt', output);
  console.log('Diagnostic output written to diag_output.txt');
}

check().catch(console.error);
