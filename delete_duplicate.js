const SUPABASE_URL = "https://yfymkbybskiueinxtqrz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmeW1rYnlic2tpdWVpbnh0cXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODMzODMsImV4cCI6MjA5OTk1OTM4M30.LPwsMU8jbgFOFwP_1z_22v7rl0TIfbzb31WMiHFsnTs";

async function deleteDuplicate() {
  const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };

  try {
    // Delete messages for the duplicate ticket first
    await fetch(`${SUPABASE_URL}/rest/v1/ticket_messages?ticket_id=eq.id-h2ky1vc61`, {
      method: "DELETE",
      headers
    });
    console.log("Deleted messages for id-h2ky1vc61");

    // Delete the duplicate ticket
    await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.id-h2ky1vc61`, {
      method: "DELETE",
      headers
    });
    console.log("Deleted ticket id-h2ky1vc61");
  } catch(e) {
    console.error(e);
  }
}

deleteDuplicate();
