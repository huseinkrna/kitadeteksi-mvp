import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTickets() {
  const { data: tickets } = await supabase.from('tickets').select('*');
  console.log("All tickets:");
  for (const t of tickets || []) {
    const { data: messages } = await supabase.from('ticket_messages').select('*').eq('ticket_id', t.id);
    console.log(`- Ticket ${t.id} (status: ${t.status}, patient: ${t.patient_id}) has ${messages?.length || 0} messages.`);
  }
}

inspectTickets();
