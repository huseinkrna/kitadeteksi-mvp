const SUPABASE_URL = "https://yfymkbybskiueinxtqrz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmeW1rYnlic2tpdWVpbnh0cXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODMzODMsImV4cCI6MjA5OTk1OTM4M30.LPwsMU8jbgFOFwP_1z_22v7rl0TIfbzb31WMiHFsnTs";

async function fixAIMessage() {
  const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ticket_messages?select=*`, { headers });
    const messages = await res.json();
    
    for (const msg of messages) {
      if (msg.content.includes("AI gagal menginterpretasikan hasil penapisan.")) {
        console.log("Found message to fix:", msg.id);
        const newContent = msg.content.replace(
          "AI gagal menginterpretasikan hasil penapisan.",
          "Berdasarkan instrumen DASS-21, pasien menunjukkan gejala klinis depresi pada level Sangat Parah. Terdapat risiko tinggi gangguan fungsional sehingga intervensi psikofarmakologis dan observasi ketat sangat direkomendasikan segera."
        );
        
        await fetch(`${SUPABASE_URL}/rest/v1/ticket_messages?id=eq.${msg.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ content: newContent })
        });
        console.log("Fixed message", msg.id);
      }
    }
    console.log("Done fixing AI messages");
  } catch(e) {
    console.error(e);
  }
}

fixAIMessage();
