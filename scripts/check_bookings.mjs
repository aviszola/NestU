import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

const { data, error } = await supabase.from('bookings').select('created_at, status');
if (error) { console.error(error); process.exit(1); }

console.log('Total bookings:', data.length);

const weeks = {};
data.forEach(b => {
  const d = new Date(b.created_at);
  const ws = new Date(d);
  ws.setDate(d.getDate() - d.getDay());
  ws.setHours(0, 0, 0, 0);
  const key = ws.toISOString().slice(0, 10);
  if (!weeks[key]) weeks[key] = { total: 0, approved: 0 };
  weeks[key].total++;
  if (b.status === 'approved') weeks[key].approved++;
});

console.log('\nBy Week:');
Object.entries(weeks).sort().forEach(([w, c]) => {
  console.log(w, 'total:', c.total, 'approved:', c.approved);
});
