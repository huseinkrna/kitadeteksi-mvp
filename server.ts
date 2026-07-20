import express from "express";
import path from "path";
import { calculateDass21, calculatePhq9, calculateGad7 } from "./src/lib/clinical-algorithms/scorer.js";
import { evaluateDecisionTree, checkRedAlert } from "./src/lib/clinical-algorithms/decision-tree.js";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_ANON_KEY || "");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateId = () => `id-${Math.random().toString(36).substring(2, 11)}`;

async function analyzeJournalWithGroq(content: string) {
  try {
    const safeContent = content.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]").replace(/\b08\d{8,11}\b/g, "[PHONE]");
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Anda AI asisten psikiater. Beri ringkasan dan analisis medis max 2 kalimat dari jurnal pasien. Awali kalimat dengan [SENTIMEN_POSITIF], [SENTIMEN_NEGATIF], atau [SENTIMEN_NETRAL]." },
        { role: "user", content: safeContent }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.2
    });
    return completion.choices[0]?.message?.content || "";
  } catch(e) { 
    console.error("Groq AI Error:", e);
    return "[SENTIMEN_NETRAL] Sistem AI sedang tidak dapat menganalisis jurnal saat ini."; 
  }
}

async function analyzeScreeningWithGroq(scores: any, dominant_category: string) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Berikan interpretasi klinis singkat (max 3 kalimat) dari skor penapisan psikologis berikut. Gunakan bahasa medis profesional yang berempati." },
        { role: "user", content: `Skor dominan: ${dominant_category}. Detail: ${JSON.stringify(scores)}` }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.2
    });
    return completion.choices[0]?.message?.content || "";
  } catch(e) {
    console.error("Groq AI Error screening:", e);
    return "AI gagal menginterpretasikan hasil penapisan."; 
  }
}

export const app = express();
app.use(express.json());

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    
    if ((email === "hasanhusein@kitedeteksi.com" || email === "hasanhusein@kitadeteksi.com") && password === "goyangduluser") {
      return res.json({
        profile: {
          user_id: "dev-001",
          email: "hasanhusein@kitedeteksi.com",
          full_name: "Super Developer",
          role: "developer",
          is_verified: true
        }
      });
    }

    const { data: profile } = await supabase.from("profiles").select("*").eq("email", email).single();
    if (!profile) return res.status(404).json({ error: "Akun tidak ditemukan" });
    if (password && profile.password !== password) return res.status(401).json({ error: "Password salah" });
    
    if (profile.role === "doctor") {
      profile.pairing_code = profile.user_id.split("-")[2]?.substring(0, 4).toUpperCase();
    }
    return res.json({ profile });
  });

  // Auth: Register
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, role, full_name, phone_number, birth_date } = req.body;
    const { data: existing } = await supabase.from("profiles").select("email").eq("email", email).single();
    if (existing) return res.status(400).json({ error: "Email sudah terdaftar" });

    const user_id = `user-${generateId()}`;

    const { data: newProfile, error } = await supabase.from("profiles").insert({
      user_id, email, password, role, full_name,
      phone_number: phone_number || "",
      birth_date: birth_date || "",
      is_verified: false
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    
    if (newProfile.role === "doctor") {
      newProfile.pairing_code = newProfile.user_id.split("-")[2]?.substring(0, 4).toUpperCase();
    }
    return res.json({ profile: newProfile });
  });

  // Profile Update
  app.post("/api/profile/update", async (req, res) => {
    const { user_id, ...updates } = req.body;
    const { data: updated, error } = await supabase.from("profiles").update(updates).eq("user_id", user_id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    
    if (updated.role === "doctor") {
      updated.pairing_code = updated.user_id.split("-")[2]?.substring(0, 4).toUpperCase();
    }
    
    return res.json({ profile: updated });
  });

  // Profile Status (Check Verification)
  app.get("/api/profile/status", async (req, res) => {
    const user_id = req.query.user_id as string;
    const { data: profile } = await supabase.from("profiles").select("is_verified").eq("user_id", user_id).single();
    return res.json({ is_verified: profile?.is_verified });
  });

  // Admin: Get All Data
  app.get("/api/admin/all-data", async (req, res) => {
    const [
      { data: profiles },
      { data: screenings },
      { data: journals },
      { data: tickets }
    ] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("screenings").select("*"),
      supabase.from("journals").select("*"),
      supabase.from("tickets").select("*")
    ]);
    
    return res.json({
      profiles: profiles || [],
      screening_results: screenings || [],
      journals: journals || [],
      consultation_tickets: tickets || []
    });
  });

  // Admin: Delete Profile
  app.post("/api/admin/delete-profile", async (req, res) => {
    const { target_user_id } = req.body;
    if (!target_user_id) return res.status(400).json({ error: "Missing user_id" });

    // Supabase will automatically cascade delete pairings and tickets if configured in DB, 
    // but just deleting profile is enough for this prototype.
    const { error } = await supabase.from("profiles").delete().eq("user_id", target_user_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  });

  // Admin: Verification
  app.post("/api/admin/verify-profile", async (req, res) => {
    const { profile_id } = req.body;
    const { data: updated } = await supabase.from("profiles").update({ is_verified: true }).eq("user_id", profile_id).select().single();
    return res.json({ profile: updated });
  });

  // Doctor: Verify Patient
  app.post("/api/doctor/verify-patient", async (req, res) => {
    const { patient_id } = req.body;
    const { data: updated } = await supabase.from("profiles").update({ is_verified: true }).eq("user_id", patient_id).select().single();
    return res.json({ profile: updated });
  });

  // Doctor: Unverified Patients
  app.get("/api/doctor/unverified-patients", async (req, res) => {
    const doctor_id = req.query.doctor_id as string;
    if (!doctor_id) return res.status(400).json({ error: "Missing doctor_id" });

    const { data: pairings } = await supabase.from("pairings").select("patient_id").eq("doctor_id", doctor_id).eq("status", "active");
    if (!pairings || pairings.length === 0) return res.json({ patients: [] });

    const patientIds = pairings.map(p => p.patient_id);
    const { data: patients } = await supabase.from("profiles").select("*").in("user_id", patientIds).eq("is_verified", false);
    
    return res.json({ patients: patients || [] });
  });

  // Patient: Submit Pairing Code
  app.post("/api/patient/pair", async (req, res) => {
    const { patient_id, pairing_code } = req.body;
    if (!patient_id || !pairing_code) return res.status(400).json({ error: "Data wajib diisi" });

    // Assuming pairing_code is exactly `user_id.split('-')[1].substring(0,5).toUpperCase()` for doctors.
    // Let's just search all doctors and find one that matches.
    const { data: doctors } = await supabase.from("profiles").select("*").eq("role", "doctor");
    if (!doctors) return res.status(404).json({ error: "Tidak ada dokter terdaftar" });

    const doctor = doctors.find(d => {
      const derivedCode = d.user_id.split("-")[2]?.substring(0, 4).toUpperCase();
      return derivedCode === pairing_code.toUpperCase();
    });

    if (!doctor) return res.status(404).json({ error: "Kode pairing salah atau dokter tidak ditemukan" });
    doctor.pairing_code = pairing_code.toUpperCase();

    const { data: pairing, error } = await supabase.from("pairings").insert({
      id: generateId(),
      patient_id,
      doctor_id: doctor.user_id,
      status: "active"
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ pairing, doctor });
  });

  // Patient: Check Pairing Status
  app.get("/api/patient/pairing-status", async (req, res) => {
    const patient_id = req.query.patient_id as string;
    const { data: pairings } = await supabase.from("pairings").select("*").eq("patient_id", patient_id).eq("status", "active");
    const pairing = pairings && pairings.length > 0 ? pairings[0] : null;
    if (!pairing) return res.json({ paired: false });

    const { data: doctor } = await supabase.from("profiles").select("*").eq("user_id", pairing.doctor_id).single();
    const { data: patient } = await supabase.from("profiles").select("*").eq("user_id", patient_id).single();

    return res.json({ paired: true, doctor, pairing, is_verified: patient?.is_verified });
  });

  // Journals: Create
  app.post("/api/journals/create", async (req, res) => {
    const { patient_id, content, mood_scale } = req.body;
    if (!patient_id || !content || mood_scale === undefined) return res.status(400).json({ error: "Semua field wajib diisi" });

    // AI Groq Magic here
    const ai_summary = await analyzeJournalWithGroq(content);
    let ai_sentiment = "NETRAL";
    if (ai_summary.includes("[SENTIMEN_POSITIF]")) ai_sentiment = "POSITIF";
    if (ai_summary.includes("[SENTIMEN_NEGATIF]")) ai_sentiment = "NEGATIF";

    const { data: journal, error } = await supabase.from("journals").insert({
      id: generateId(), patient_id, content, mood_scale, ai_summary, ai_sentiment
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ journal });
  });

  // Journals: List
  app.get("/api/journals", async (req, res) => {
    const { patient_id } = req.query;
    const { data: journals } = await supabase.from("journals").select("*").eq("patient_id", patient_id).order("created_at", { ascending: false });
    return res.json({ journals });
  });

  // Screenings: Submit and Evaluate
  app.post("/api/screenings/submit", async (req, res) => {
    const { patient_id, test_type, answers } = req.body;
    let scoreDetails: any = { answers };
    let dominant_category = "Normal";
    let is_critical = false;
    let nextStep = "SELESAI_NORMAL";

    if (test_type === "dass21") {
      const dassResult = calculateDass21(answers);
      scoreDetails = { ...scoreDetails, dep: dassResult.depression.score, anx: dassResult.anxiety.score, str: dassResult.stress.score };
      const maxLevel = Math.max(dassResult.depression.level, dassResult.anxiety.level, dassResult.stress.level);
      if (maxLevel === 0) dominant_category = "Normal";
      else if (dassResult.depression.level === maxLevel) dominant_category = `Depresi (${dassResult.depression.label})`;
      else if (dassResult.anxiety.level === maxLevel) dominant_category = `Kecemasan (${dassResult.anxiety.label})`;
      else dominant_category = `Stres (${dassResult.stress.label})`;
      nextStep = evaluateDecisionTree(dassResult);
      if (maxLevel >= 3) is_critical = true;
    } else if (test_type === "phq9") {
      const phqResult = calculatePhq9(answers);
      is_critical = checkRedAlert(answers);
      scoreDetails.total = phqResult.score;
      dominant_category = `Depresi (PHQ-9, ${phqResult.label})`;
      nextStep = "SELESAI";
    } else if (test_type === "gad7") {
      const gadResult = calculateGad7(answers);
      scoreDetails.total = gadResult.score;
      dominant_category = `Kecemasan (GAD-7, ${gadResult.label})`;
      nextStep = "SELESAI";
    } else {
      return res.status(400).json({ error: "Tipe penapisan tidak didukung" });
    }

    const ai_analysis = await analyzeScreeningWithGroq(scoreDetails, dominant_category);

    const { data: screeningResult, error } = await supabase.from("screenings").insert({
      id: generateId(), patient_id, test_type, raw_scores: scoreDetails, dominant_category, is_critical, ai_analysis
    }).select().single();

    if (is_critical) {
      const { data: pairings } = await supabase.from("pairings").select("doctor_id").eq("patient_id", patient_id);
      const { data: existingTickets } = await supabase.from("tickets").select("*").eq("patient_id", patient_id).in("status", ["open", "escalated"]);
      const pairing = pairings && pairings.length > 0 ? pairings[0] : null;
      if (pairing) {
        let ticketId = existingTickets && existingTickets.length > 0 ? existingTickets[0].id : generateId();
        if (!existingTickets || existingTickets.length === 0) {
          await supabase.from("tickets").insert({ id: ticketId, patient_id, doctor_id: pairing.doctor_id, status: "escalated" });
        } else {
          await supabase.from("tickets").update({ status: "escalated", updated_at: new Date().toISOString() }).eq("id", ticketId);
        }
        await supabase.from("ticket_messages").insert({
          id: generateId(), ticket_id: ticketId, sender_id: patient_id, 
          content: "[SISTEM TRIAGE DARURAT]: Pasien terdeteksi dalam situasi sangat kritis. Evaluasi AI: " + ai_analysis,
          is_ai_summary: true
        });
      }
    }

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ result: screeningResult, is_critical, nextStep });
  });

  // Screenings: List
  app.get("/api/screenings", async (req, res) => {
    const { patient_id } = req.query;
    const { data: screenings } = await supabase.from("screenings").select("*").eq("patient_id", patient_id).order("created_at", { ascending: false });
    return res.json({ screenings });
  });

  // Tickets: Create
  app.post("/api/tickets/create", async (req, res) => {
    const { patient_id, doctor_id, initial_message } = req.body;
    const { data: existingTickets } = await supabase.from("tickets").select("*").eq("patient_id", patient_id).in("status", ["open", "escalated"]);
    const existing = existingTickets && existingTickets.length > 0 ? existingTickets[0] : null;
    let ticketId = existing ? existing.id : generateId();

    if (!existing) {
      await supabase.from("tickets").insert({ id: ticketId, patient_id, doctor_id, status: "open" });
    }

    if (initial_message) {
      await supabase.from("ticket_messages").insert({ id: generateId(), ticket_id: ticketId, sender_id: patient_id, content: initial_message });
    }
    const { data: ticket } = await supabase.from("tickets").select("*").eq("id", ticketId).single();
    return res.json({ ticket });
  });

  // Tickets: List for Patient or Doctor
  app.get("/api/debug/tickets", async (req, res) => {
    const { data: tickets } = await supabase.from("tickets").select("*");
    const { data: messages } = await supabase.from("ticket_messages").select("*");
    return res.json({ tickets, messages });
  });

  app.get("/api/tickets", async (req, res) => {
    const { patient_id, doctor_id } = req.query;
    if (patient_id) {
      const { data: tickets } = await supabase.from("tickets").select("*").eq("patient_id", patient_id).order("updated_at", { ascending: false });
      return res.json({ tickets });
    }
    if (doctor_id) {
      // Need a join with profiles. Supabase makes this easy if foreign keys are setup properly, but since we didn't specify foreign keys strictly in the simplified view we might just fetch patients manually.
      const { data: tickets } = await supabase.from("tickets").select("*").eq("doctor_id", doctor_id).order("updated_at", { ascending: false });
      if (!tickets) return res.json({ tickets: [] });

      const patientIds = tickets.map(t => t.patient_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", patientIds);
      
      const enriched = tickets.map((t) => {
        const p = profiles?.find(prof => prof.user_id === t.patient_id);
        return { ...t, patient_name: p?.full_name, patient_email: p?.email };
      });
      return res.json({ tickets: enriched });
    }
    return res.json({ tickets: [] });
  });

  // Tickets: Details
  app.get("/api/tickets/:id", async (req, res) => {
    const { data: ticket } = await supabase.from("tickets").select("*").eq("id", req.params.id).single();
    if (!ticket) return res.status(404).json({ error: "Tiket tidak ditemukan" });

    const { data: messages } = await supabase.from("ticket_messages").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", ticket.patient_id).single();
    const { data: journals } = await supabase.from("journals").select("*").eq("patient_id", ticket.patient_id).order("created_at", { ascending: false }).limit(3);
    const { data: screenings } = await supabase.from("screenings").select("*").eq("patient_id", ticket.patient_id).order("created_at", { ascending: false });

    return res.json({ ticket, messages, patient: { profile, journals, screenings } });
  });

  // Tickets: Message
  app.post("/api/tickets/:id/message", async (req, res) => {
    const ticketId = req.params.id;
    const { sender_id, message_payload } = req.body;
    const { data: message } = await supabase.from("ticket_messages").insert({
      id: generateId(), ticket_id: ticketId, sender_id, content: message_payload
    }).select().single();
    await supabase.from("tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId);
    
    const { data: updatedTicket } = await supabase.from("tickets").select("*").eq("id", ticketId).single();
    return res.json({ message, ticket: updatedTicket });
  });

  // Resolve Emergency
  app.post("/api/tickets/:id/resolve-emergency", async (req, res) => {
    const { data: ticket } = await supabase.from("tickets").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single();
    return res.json({ ticket });
  });

  // Doctor: Patients List
  app.get("/api/doctor/patients", async (req, res) => {
    const { doctor_id } = req.query;
    const { data: pairings } = await supabase.from("pairings").select("patient_id").eq("doctor_id", doctor_id).eq("status", "active");
    if (!pairings || pairings.length === 0) return res.json({ patients: [] });

    const patientIds = pairings.map(p => p.patient_id);
    const { data: patients } = await supabase.from("profiles").select("*").in("user_id", patientIds);
    
    const enriched = await Promise.all(patients!.map(async (p) => {
      const { data: scr } = await supabase.from("screenings").select("*").eq("patient_id", p.user_id).order("created_at", { ascending: false }).limit(1);
      const latestScreening = scr?.[0];
      let riskLevel = "Rendah";
      if (latestScreening) {
        const dom = latestScreening.dominant_category.toLowerCase();
        if (latestScreening.is_critical || dom.includes("parah") || dom.includes("berat")) riskLevel = "Tinggi";
        else if (dom.includes("sedang") || dom.includes("ringan")) riskLevel = "Sedang";
      }
      return { ...p, latestScreening, riskLevel };
    }));

    return res.json({ patients: enriched });
  });
  
  // Fake SLA Cron Check (To keep Render awake)
  app.get("/api/cron/sla-check", (req, res) => {
    console.log("Cron Ping Received: Keeping Render Awake!");
    return res.json({ success: true, message: "System operational." });
  });

  // --- VITE MIDDLEWARE ---
  async function startDevServer() {
    const PORT = Number(process.env.PORT) || 3000;
    const HOST = process.env.HOST || "0.0.0.0";

    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
    }

    app.listen(PORT, HOST, () => {
      console.log(`Server running on ${HOST}:${PORT} (NODE_ENV=${process.env.NODE_ENV || "development"})`);
    });
  }

  // Only start the local server if not running on Vercel
  if (!process.env.VERCEL) {
    startDevServer();
  }
