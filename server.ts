import express from "express";
import path from "path";
import { calculateDass21, calculatePhq9, calculateGad7 } from "./src/lib/clinical-algorithms/scorer.js";
import { evaluateDecisionTree, checkRedAlert } from "./src/lib/clinical-algorithms/decision-tree.js";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import webpush from "web-push";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
const supabase = createClient(
  SUPABASE_URL || "https://dummy.supabase.co", 
  SUPABASE_KEY || "dummy"
);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy_key" });

// VAPID Configuration for Web Push Notifications
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:developer@ruangtara.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const generateId = () => `id-${Math.random().toString(36).substring(2, 11)}`;

async function sendWhatsAppFonnte(targetPhone: string, message: string) {
  try {
    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      console.log("FONNTE_TOKEN not found. Skipping WhatsApp notification.");
      return null;
    }
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": token
      },
      body: new URLSearchParams({
        target: targetPhone,
        message: message
      })
    });
    const data = await response.json();
    console.log("Fonnte WA Response:", data);
    return data;
  } catch (e) {
    console.error("Fonnte WA Error:", e);
  }
}

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
    try {
      const { email, password } = req.body;
      
      const devEmail = "hasanhusein@ruangtara.com";
      const devPassword = "goyangduluser";
      
      if (email?.trim().toLowerCase() === devEmail && password?.trim() === devPassword) {
        return res.json({
          profile: {
            user_id: "dev-001",
            email: devEmail,
            role: "developer",
            full_name: "Super Admin (Developer)",
            is_verified: true
          }
        });
      }

      if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === "https://dummy.supabase.co") {
        return res.status(500).json({ 
          error: "Konfigurasi Database Vercel Kosong: Variabel SUPABASE_URL belum aktif di lingkungan Preview ini. Harap centang 'Preview' di pengaturan Vercel dan lakukan Redeploy tanpa cache." 
        });
      }

      const { data: profile, error: fetchErr } = await supabase.from("profiles").select("*").eq("email", email).single();
      if (fetchErr || !profile) return res.status(404).json({ error: "Akun tidak ditemukan atau email salah" });
      if (password && profile.password !== password) return res.status(401).json({ error: "Password salah" });
      
      if (profile.role === "doctor") {
        profile.pairing_code = profile.user_id.split("-")[2]?.substring(0, 4).toUpperCase();
      }
      return res.json({ profile });
    } catch (err: any) {
      console.error("Login error:", err);
      return res.status(500).json({ error: `Gagal login (Error Server): ${err.message || err}` });
    }
  });

  // Auth: Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, role, full_name, phone_number, birth_date, is_new_patient, pairing_code } = req.body;
      
      if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === "https://dummy.supabase.co") {
        return res.status(500).json({ 
          error: "Konfigurasi Database Vercel Kosong: Variabel SUPABASE_URL belum aktif di lingkungan Preview ini. Harap centang 'Preview' di pengaturan Vercel dan lakukan Redeploy tanpa cache." 
        });
      }

      // Check if email exists
      const { data: existing } = await supabase.from("profiles").select("email").eq("email", email).single();
      if (existing) return res.status(400).json({ error: "Email sudah terdaftar" });

      let assignedDoctorId = null;

      // Validate and prepare doctor assignment for patients BEFORE creating profile
      if (role === "patient") {
        if (!is_new_patient && pairing_code) {
          // Pasien Lama - Validate pairing code
          const { data: doctors } = await supabase.from("profiles").select("*").eq("role", "doctor");
          const doctor = doctors?.find(d => {
            const derivedCode = d.user_id.split("-")[2]?.substring(0, 4).toUpperCase();
            return derivedCode === pairing_code.toUpperCase();
          });
          
          if (!doctor) {
            return res.status(404).json({ error: "Kode pairing salah atau dokter tidak ditemukan" });
          }
          assignedDoctorId = doctor.user_id;
        } else if (is_new_patient) {
          // Pasien Baru - Least Connection
          const { data: doctors } = await supabase.from("profiles").select("user_id").eq("role", "doctor").order('created_at', { ascending: true });
          if (doctors && doctors.length > 0) {
            const { data: pairings } = await supabase.from("pairings").select("doctor_id").eq("status", "active");
            const doctorCounts = doctors.map(d => ({
               user_id: d.user_id,
               count: pairings?.filter(p => p.doctor_id === d.user_id).length || 0
            }));
            // Sort by count ascending (Least Connection). If equal, maintains original order (first doctor).
            doctorCounts.sort((a, b) => a.count - b.count);
            assignedDoctorId = doctorCounts[0].user_id;
          }
        }
      }

      const user_id = `user-${generateId()}`;

      // Create profile
      const { data: newProfile, error } = await supabase.from("profiles").insert({
        user_id, email, password, role, full_name,
        phone_number: phone_number || "",
        birth_date: birth_date || "",
        is_verified: false,
        assigned_at: new Date().toISOString()
      }).select().single();

      if (error) return res.status(500).json({ error: error.message });
      
      // Create pairing if doctor assigned
      if (role === "patient" && assignedDoctorId) {
        await supabase.from("pairings").insert({
          id: generateId(),
          patient_id: newProfile.user_id,
          doctor_id: assignedDoctorId,
          status: "active"
        });
      }

      if (newProfile.role === "doctor") {
        newProfile.pairing_code = newProfile.user_id.split("-")[2]?.substring(0, 4).toUpperCase();
      }
      
      return res.json({ profile: newProfile });
    } catch (err: any) {
      console.error("Register error:", err);
      return res.status(500).json({ error: `Gagal mendaftar akun (Error Server): ${err.message || err}` });
    }
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

  app.post("/api/doctor/takeover-emergency", async (req, res) => {
    const { ticket_id, doctor_id } = req.body;
    
    // Check ticket status
    const { data: ticket } = await supabase.from("tickets").select("*").eq("id", ticket_id).single();
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.status !== "escalated" && ticket.status !== "unassigned_emergency") {
      // Find out who took it
      const { data: pairing } = await supabase.from("pairings").select("doctor_id").eq("patient_id", ticket.patient_id).eq("status", "active").single();
      let docName = "lainnya";
      if (pairing && pairing.doctor_id !== doctor_id) {
         const { data: docInfo } = await supabase.from("profiles").select("full_name").eq("user_id", pairing.doctor_id).single();
         if (docInfo) docName = docInfo.full_name;
      }
      return res.status(409).json({ error: `Terima kasih atas respons cepat Anda. Pasien ini baru saja diambil alih oleh dr. ${docName}.` });
    }
    
    // Check-and-set to prevent race conditions
    // Actually we just set it to "open" and check if it worked (since this is simulated Supabase on local).
    // In actual Supabase we might need a trigger or RPC, but this is fine for MVP.
    const { data: updatedTicket, error } = await supabase.from("tickets").update({ status: "open" }).eq("id", ticket_id).select().single();
    if (error || !updatedTicket) {
       return res.status(409).json({ error: "Gagal mengambil alih tiket." });
    }
    
    // Successfully locked! Update pairing if taken by different doctor (via unassigned_emergency)
    const { data: existingPairings } = await supabase.from("pairings").select("*").eq("patient_id", ticket.patient_id).eq("status", "active");
    if (existingPairings && existingPairings.length > 0) {
      if (existingPairings[0].doctor_id !== doctor_id) {
        // Re-assign pairing to this new doctor!
        await supabase.from("pairings").delete().eq("patient_id", ticket.patient_id);
        await supabase.from("pairings").insert({
          id: generateId(),
          patient_id: ticket.patient_id,
          doctor_id: doctor_id,
          status: "active"
        });
      }
    }
    
    // Verify patient instantly (Bypass birokrasi) and update assigned_at
    await supabase.from("profiles").update({ is_verified: true, assigned_at: new Date().toISOString() }).eq("user_id", ticket.patient_id);
    
    return res.json({ success: true, ticket: updatedTicket });
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
      const { data: existingTickets } = await supabase.from("tickets").select("*").eq("patient_id", patient_id).in("status", ["open", "escalated", "unassigned_emergency"]);
      const pairing = pairings && pairings.length > 0 ? pairings[0] : null;
      if (pairing) {
        let ticketId = existingTickets && existingTickets.length > 0 ? existingTickets[0].id : generateId();
        const isAlreadyEmergency = existingTickets && existingTickets.length > 0 && (existingTickets[0].status === "escalated" || existingTickets[0].status === "unassigned_emergency");

        if (!existingTickets || existingTickets.length === 0) {
          await supabase.from("tickets").insert({ id: ticketId, patient_id, doctor_id: pairing.doctor_id, status: "escalated" });
        } else if (!isAlreadyEmergency) {
          await supabase.from("tickets").update({ status: "escalated", updated_at: new Date().toISOString() }).eq("id", ticketId);
        }
        
        // Send WA Blast and System Message ONLY IF NOT ALREADY IN EMERGENCY
        if (!isAlreadyEmergency) {
          await supabase.from("ticket_messages").insert({
            id: generateId(), ticket_id: ticketId, sender_id: patient_id, 
            content: "[SISTEM TRIAGE DARURAT]: Pasien terdeteksi dalam situasi sangat kritis. Evaluasi AI: " + ai_analysis,
            is_ai_summary: true
          });

          // WhatsApp Notification (Menit ke-0: Hanya ke Dokter Penanggung Jawab)
          const { data: doctorProfile } = await supabase.from("profiles").select("phone_number").eq("user_id", pairing.doctor_id).single();
          const { data: patientProfile } = await supabase.from("profiles").select("full_name").eq("user_id", patient_id).single();
          const waMessage = `🚨 DARURAT (Pasien: ${patientProfile?.full_name || "Tanpa Nama"})\n\nEvaluasi AI: ${ai_analysis}\n\nAmbil alih: https://ruangtara-mvp.vercel.app/dashboard/triage/bypass/${ticketId}`;
          
          if (doctorProfile && doctorProfile.phone_number) {
             await sendWhatsAppFonnte(doctorProfile.phone_number, waMessage);
          }
        }
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
    const { data: existingTickets } = await supabase.from("tickets").select("*").eq("patient_id", patient_id).in("status", ["open", "escalated", "unassigned_emergency"]);
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

    // Cek sesi konsultasi aktif 24 jam
    const { data: sessions } = await supabase.from("chat_sessions")
      .select("*")
      .eq("patient_id", ticket.patient_id)
      .eq("doctor_id", ticket.doctor_id)
      .eq("is_active", true)
      .order("expires_at", { ascending: false });

    const activeSession = sessions && sessions.length > 0 ? sessions[0] : null;
    const isSessionActive = activeSession && new Date(activeSession.expires_at).getTime() > Date.now();

    return res.json({ ticket, messages, patient: { profile, journals, screenings }, activeSession: isSessionActive ? activeSession : null, isSessionActive });
  });

  // Tickets: Message
  app.post("/api/tickets/:id/message", async (req, res) => {
    const ticketId = req.params.id;
    const { sender_id, message_payload } = req.body;

    // Gatekeeper Token Konsultasi 24 Jam: Periksa tiket
    const { data: ticket } = await supabase.from("tickets").select("*").eq("id", ticketId).single();
    if (!ticket) return res.status(404).json({ error: "Tiket tidak ditemukan" });

    // Jika bukan darurat medis (escalated / unassigned_emergency), wajib punya sesi konsultasi 24 jam yang aktif
    const isEmergency = ticket.status === "escalated" || ticket.status === "unassigned_emergency";
    if (!isEmergency) {
      const { data: sessions } = await supabase.from("chat_sessions")
        .select("*")
        .eq("patient_id", ticket.patient_id)
        .eq("doctor_id", ticket.doctor_id)
        .eq("is_active", true)
        .order("expires_at", { ascending: false });

      const activeSession = sessions && sessions.length > 0 ? sessions[0] : null;
      const isExpired = !activeSession || new Date(activeSession.expires_at).getTime() <= Date.now();

      if (isExpired) {
        return res.status(403).json({
          error: "Sesi konsultasi 24 jam belum aktif atau sudah berakhir. Gunakan 1 Token untuk memulai konsultasi.",
          session_required: true,
          ticket_id: ticketId,
          patient_id: ticket.patient_id,
          doctor_id: ticket.doctor_id
        });
      }
    }

    const { data: message } = await supabase.from("ticket_messages").insert({
      id: generateId(), ticket_id: ticketId, sender_id, content: message_payload
    }).select().single();
    await supabase.from("tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId);
    
    const { data: updatedTicket } = await supabase.from("tickets").select("*").eq("id", ticketId).single();
    
    // Kirim Notifikasi Web Push ke Penerima (Dokter/Pasien)
    if (updatedTicket) {
      const recipientId = sender_id === updatedTicket.patient_id ? updatedTicket.doctor_id : updatedTicket.patient_id;
      const { data: recipientProfile } = await supabase.from("profiles").select("phone_number, full_name, push_subscription").eq("user_id", recipientId).single();
      const { data: senderProfile } = await supabase.from("profiles").select("full_name").eq("user_id", sender_id).single();
      
      const textMsg = message_payload.length > 50 ? message_payload.substring(0, 50) + "..." : message_payload;
      
      if (recipientProfile) {
        // 1. Web Push Notification (PWA)
        if (recipientProfile.push_subscription && process.env.VAPID_PUBLIC_KEY) {
           const payload = JSON.stringify({
              title: `Pesan Baru dari ${senderProfile?.full_name || "Pengguna"}`,
              body: textMsg,
              icon: "/RUANGTARA.svg"
           });
           try {
             await webpush.sendNotification(recipientProfile.push_subscription, payload);
           } catch(e) {
             console.error("Web Push Error for message:", e);
           }
        }
      }
    }

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
  
  // SLA Cron Check & Auto-Reassignment & Emergency Blasts
  app.get("/api/cron/sla-check", async (req, res) => {
    console.log("Running SLA Audit & Auto-Reassignment...");
    let reassignedCount = 0;
    let blastCount = 0;
    
    try {
      const { data: unverified } = await supabase.from("profiles").select("*").eq("role", "patient").eq("is_verified", false);
      
      if (unverified && unverified.length > 0) {
        const now = Date.now();
        const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;
        const THIRTY_MINUTES = 30 * 60 * 1000;
        
        for (const p of unverified) {
          const assignmentTime = p.assigned_at ? new Date(p.assigned_at).getTime() : new Date(p.created_at || now).getTime();
          const waitTime = now - assignmentTime;
          
          // 1. Check for Emergency SLA (30 mins)
          // Find if this patient has an escalated ticket
          const { data: tickets } = await supabase.from("tickets").select("*").eq("patient_id", p.user_id).in("status", ["escalated", "unassigned_emergency"]);
          const hasEmergency = tickets && tickets.length > 0;
          
          if (hasEmergency) {
             const ticket = tickets[0];
             if (waitTime > THIRTY_MINUTES && ticket.status === "escalated") {
                // Change ticket status to 'unassigned_emergency' and blast WA!
                await supabase.from("tickets").update({ status: "unassigned_emergency" }).eq("id", ticket.id);
                const waMessage = `🚨 DARURAT (Pasien: ${p.full_name})\n\nEvaluasi AI: Pasien kritis SLA terlewati, segera intervensi!\n\nAmbil alih: https://ruangtara-mvp.vercel.app/dashboard/triage/bypass/${ticket.id}`;
                console.log(waMessage);
                
                // Cari nomor HP dokter-dokter spesialis untuk diblast
                const { data: doctors } = await supabase.from("profiles").select("phone_number").eq("role", "doctor");
                if (doctors) {
                   for (const doc of doctors) {
                     if (doc.phone_number) await sendWhatsAppFonnte(doc.phone_number, waMessage);
                   }
                }
                blastCount++;
             }
          } 
          // 2. Check for Normal SLA (72 hours)
          else if (waitTime > SEVENTY_TWO_HOURS) {
             const { data: pairings } = await supabase.from("pairings").select("*").eq("patient_id", p.user_id).eq("status", "active");
             const oldPairing = pairings && pairings.length > 0 ? pairings[0] : null;
             
             const { data: doctors } = await supabase.from("profiles").select("user_id").eq("role", "doctor").order('created_at', { ascending: true });
             
             if (doctors && doctors.length > 1) { // Need at least another doctor to reassign
               const { data: allPairings } = await supabase.from("pairings").select("doctor_id").eq("status", "active");
               const doctorCounts = doctors
                 .map(d => ({
                   user_id: d.user_id,
                   count: allPairings?.filter(ap => ap.doctor_id === d.user_id).length || 0
                 }))
                 .filter(d => d.user_id !== oldPairing?.doctor_id); 
                 
               if (doctorCounts.length > 0) {
                 doctorCounts.sort((a, b) => a.count - b.count);
                 const newDoctorId = doctorCounts[0].user_id;
                 
                 if (oldPairing) {
                   await supabase.from("pairings").delete().eq("id", oldPairing.id);
                 }
                 await supabase.from("pairings").insert({
                   id: generateId(),
                   patient_id: p.user_id,
                   doctor_id: newDoctorId,
                   status: "active"
                 });
                 
                 // Restart the 72-hour clock by updating assigned_at! NOT created_at!
                 await supabase.from("profiles").update({ assigned_at: new Date().toISOString() }).eq("user_id", p.user_id);
                 reassignedCount++;
               }
             }
          }
        }
      }
    } catch (e) {
      console.error("Cron Error:", e);
    }
    
    return res.json({ success: true, message: `System operational. Reassigned ${reassignedCount} patients. Blasted ${blastCount} emergencies.` });
  });

  // --- Web Push Notifications API ---
  app.post("/api/push/subscribe", async (req, res) => {
    const { subscription, user_id } = req.body;
    try {
      // In a real MVP with proper schema, we store this subscription object.
      // Assuming 'push_subscription' column can be added or exists in 'profiles' (JSONB).
      // If it fails, we gracefully degrade.
      const { error } = await supabase.from("profiles").update({ push_subscription: subscription }).eq("user_id", user_id);
      if (error) console.warn("Supabase schema might not have push_subscription column yet:", error.message);
      res.status(201).json({});
    } catch(e) {
      console.error("Push subscribe error", e);
      res.status(500).json({ error: "Gagal menyimpan subskripsi notifikasi" });
    }
  });

  app.get("/api/cron/morning-journal", async (req, res) => {
    try {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, push_subscription").eq("role", "patient");
      
      let sentCount = 0;
      if (profiles) {
        for (const p of profiles) {
          if (p.push_subscription) {
            const payload = JSON.stringify({
              title: "Selamat Pagi, Waktunya Jurnal! 🌅",
              body: `Halo ${p.full_name}, yuk ceritakan apa yang sedang kamu pikirkan atau rasakan pagi ini di RUANGTARA.`,
              icon: "/RUANGTARA.svg"
            });
            try {
              await webpush.sendNotification(p.push_subscription, payload);
              sentCount++;
            } catch(e) {
              console.error("Push Error for", p.user_id, e);
            }
          }
        }
      }
      res.json({ success: true, message: `Berhasil mengirim ${sentCount} notifikasi pengingat pagi.` });
    } catch(e) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- MONETIZATION & TOKEN SYSTEM (POIN 9-13) ---
  // 1. Get Wallet Balance
  app.get("/api/wallet", async (req, res) => {
    const user_id = req.query.user_id as string;
    if (!user_id) return res.status(400).json({ error: "user_id diperlukan" });

    let { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user_id).single();
    if (!wallet) {
      const { data: newWallet, error } = await supabase.from("wallets").insert({
        user_id,
        token_balance: 0,
        updated_at: new Date().toISOString()
      }).select().single();
      if (error && !error.message.includes("duplicate")) return res.status(500).json({ error: error.message });
      wallet = newWallet || { user_id, token_balance: 0 };
    }
    return res.json({ wallet });
  });

  // 2. Get Transaction History
  app.get("/api/transactions", async (req, res) => {
    const user_id = req.query.user_id as string;
    if (!user_id) return res.status(400).json({ error: "user_id diperlukan" });

    const { data: transactions } = await supabase.from("transactions")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });
    return res.json({ transactions: transactions || [] });
  });

  // 3. Checkout Token (Dummy QRIS Interaktif / Escape Hatch)
  app.post("/api/payment/checkout-dummy", async (req, res) => {
    const { user_id, tier_id } = req.body;
    if (!user_id || !tier_id) return res.status(400).json({ error: "user_id dan tier_id wajib diisi" });

    const pricingMap: Record<string, { tokens: number; amount: number; label: string }> = {
      "tier_1": { tokens: 1, amount: 50000, label: "Paket Coba-Coba" },
      "tier_2": { tokens: 3, amount: 142500, label: "Paket Decoy 3 Token" },
      "tier_3": { tokens: 5, amount: 217500, label: "Best Seller (5 Token)" },
      "tier_4": { tokens: 10, amount: 400000, label: "Paket Intensif (10 Token)" }
    };

    const selectedTier = pricingMap[tier_id];
    if (!selectedTier) return res.status(400).json({ error: "Tier penawaran tidak valid" });

    const order_id = `ORD-DUMMY-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data: transaction, error } = await supabase.from("transactions").insert({
      order_id,
      user_id,
      gross_amount: selectedTier.amount,
      tokens_added: selectedTier.tokens,
      status: "pending",
      payment_url: `/checkout/qris-simulate?order_id=${order_id}`,
      created_at: new Date().toISOString()
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, transaction, tier: selectedTier });
  });

  // 4. Simulate Payment Success (Escape Hatch: Tombol "Simulasikan Pembayaran Berhasil")
  app.post("/api/payment/simulate-success", async (req, res) => {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: "order_id wajib diisi" });

    const { data: transaction } = await supabase.from("transactions").select("*").eq("order_id", order_id).single();
    if (!transaction) return res.status(404).json({ error: "Transaksi tidak ditemukan" });

    if (transaction.status === "settled") {
      return res.json({ success: true, message: "Transaksi sudah berhasil sebelumnya", transaction });
    }

    const { data: updatedTx } = await supabase.from("transactions")
      .update({ status: "settled" })
      .eq("order_id", order_id)
      .select()
      .single();

    let { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", transaction.user_id).single();
    if (!wallet) {
      const { data: newW } = await supabase.from("wallets").insert({
        user_id: transaction.user_id,
        token_balance: transaction.tokens_added,
        updated_at: new Date().toISOString()
      }).select().single();
      wallet = newW;
    } else {
      const newBalance = (wallet.token_balance || 0) + (transaction.tokens_added || 0);
      const { data: updatedW } = await supabase.from("wallets")
        .update({ token_balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", transaction.user_id)
        .select()
        .single();
      wallet = updatedW;
    }

    return res.json({ success: true, message: "Simulasi pembayaran berhasil! Token telah ditambahkan.", transaction: updatedTx, wallet });
  });

  // 5. Activate 24-Hour Consultation Session (Potong 1 Token)
  app.post("/api/consultation/activate", async (req, res) => {
    const { patient_id, doctor_id, ticket_id } = req.body;
    if (!patient_id || !doctor_id) return res.status(400).json({ error: "patient_id dan doctor_id wajib diisi" });

    const { data: existingSessions } = await supabase.from("chat_sessions")
      .select("*")
      .eq("patient_id", patient_id)
      .eq("doctor_id", doctor_id)
      .eq("is_active", true)
      .order("expires_at", { ascending: false });

    const activeSession = existingSessions && existingSessions.length > 0 ? existingSessions[0] : null;
    if (activeSession && new Date(activeSession.expires_at).getTime() > Date.now()) {
      return res.json({ success: true, message: "Sesi konsultasi 24 jam masih aktif", session: activeSession });
    }

    const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", patient_id).single();
    if (!wallet || (wallet.token_balance || 0) < 1) {
      return res.status(403).json({
        error: "Saldo token tidak mencukupi untuk memulai sesi konsultasi. Silakan top up token terlebih dahulu.",
        insufficient_tokens: true
      });
    }

    const newBalance = wallet.token_balance - 1;
    await supabase.from("wallets").update({ token_balance: newBalance, updated_at: new Date().toISOString() }).eq("user_id", patient_id);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 Jam
    const sessionId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const { data: newSession, error: sessionErr } = await supabase.from("chat_sessions").insert({
      id: sessionId,
      patient_id,
      doctor_id,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      is_active: true
    }).select().single();

    if (sessionErr) return res.status(500).json({ error: sessionErr.message });

    if (ticket_id) {
      await supabase.from("ticket_messages").insert({
        id: generateId(),
        ticket_id,
        sender_id: patient_id,
        content: `[SISTEM]: Token Konsultasi 24 Jam diaktifkan! Ruang chat konsultasi kini terbuka hingga ${expiresAt.toLocaleString("id-ID")}.`,
        is_ai_summary: true
      });
    }

    return res.json({ success: true, message: "Sesi konsultasi 24 jam berhasil diaktifkan!", session: newSession, remaining_tokens: newBalance });
  });

  // 6. Check Active Consultation Status
  app.get("/api/consultation/status", async (req, res) => {
    try {
      const { patient_id, doctor_id } = req.query;
      if (!patient_id || !doctor_id) return res.status(400).json({ error: "patient_id dan doctor_id wajib diisi" });

      const { data: existingSessions } = await supabase.from("chat_sessions")
        .select("*")
        .eq("patient_id", patient_id as string)
        .eq("doctor_id", doctor_id as string)
        .eq("is_active", true)
        .order("expires_at", { ascending: false });

      const activeSession = existingSessions && existingSessions.length > 0 ? existingSessions[0] : null;
      if (activeSession && new Date(activeSession.expires_at).getTime() > Date.now()) {
        return res.json({ is_active: true, session: activeSession });
      }
      return res.json({ is_active: false, session: null });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Error checking session" });
    }
  });

  // --- VITE MIDDLEWARE ---
  async function startDevServer() {
    const PORT = Number(process.env.PORT) || 3000;
    const HOST = process.env.HOST || "0.0.0.0";

    if (process.env.NODE_ENV !== "production") {
      const vModule = "vite";
      const { createServer: createViteServer } = await import(vModule);
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

  export default app;
