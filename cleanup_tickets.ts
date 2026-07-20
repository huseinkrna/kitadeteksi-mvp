import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanEmptyTickets() {
  const { data: tickets } = await supabase.from('tickets').select('*');
  
  if (!tickets) return console.log("No tickets found.");
  
  for (const t of tickets) {
    const { count } = await supabase
      .from('ticket_messages')
      .select('*', { count: 'exact', head: true })
      .eq('ticket_id', t.id);
      
    if (count === 0) {
      console.log(`Deleting empty ticket: ${t.id}`);
      await supabase.from('tickets').delete().eq('id', t.id);
    }
  }
  console.log("Cleanup complete!");
}

cleanEmptyTickets();
