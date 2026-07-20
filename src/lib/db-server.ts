import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "db.json");

export interface DBProfile {
  id: string;
  user_id: string;
  email: string;
  password?: string; // stored for demo authentication
  role: "patient" | "doctor" | "developer";
  full_name: string;
  phone_number: string;
  pairing_code?: string; // used by doctors
  regimen?: string;
  specialization?: string;
  is_verified?: boolean;
  created_at: string;
}

export interface DBDoctorPatient {
  id: string;
  doctor_id: string;
  patient_id: string;
  pairing_code: string;
  created_at: string;
}

export interface DBJournal {
  id: string;
  patient_id: string;
  content: string;
  mood_scale: number; // 1-10
  created_at: string;
}

export interface DBScreeningResult {
  id: string;
  patient_id: string;
  test_type: "dass21" | "phq9" | "gad7";
  raw_scores: {
    dep?: number;
    anx?: number;
    str?: number;
    total?: number;
    answers: number[];
  };
  dominant_category: string; // e.g. "Depresi", "Kecemasan", "Stres", "Normal"
  is_critical: boolean;
  created_at: string;
}

export interface DBConsultationTicket {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: "open" | "escalated" | "resolved";
  sla_deadline: string;
  created_at: string;
}

export interface DBTicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message_payload: string;
  created_at: string;
}

export interface DBAuditLog {
  id: string;
  user_id: string;
  action: string;
  target_id?: string;
  created_at: string;
}

export interface DBStructure {
  profiles: DBProfile[];
  doctor_patient: DBDoctorPatient[];
  journals: DBJournal[];
  screening_results: DBScreeningResult[];
  consultation_tickets: DBConsultationTicket[];
  ticket_messages: DBTicketMessage[];
  audit_logs: DBAuditLog[];
}

const INITIAL_DB: DBStructure = {
  profiles: [
    {
      id: "prof-doc-1",
      user_id: "doctor-123",
      email: "doctor@kitadeteksi.com",
      password: "password",
      role: "doctor",
      full_name: "Dr. Sarah, Sp.KJ",
      phone_number: "+62-811-999-888",
      pairing_code: "X7B9K",
      specialization: "Psikiater Spesialis Gangguan Kecemasan & Depresi",
      is_verified: true,
      created_at: "2026-07-01T00:00:00.000Z"
    },
    {
      id: "prof-dev-1",
      user_id: "developer-999",
      email: "developer@kitadeteksi.com",
      password: "password",
      role: "developer",
      full_name: "Super Admin Developer",
      phone_number: "+62-899-999-999",
      is_verified: true,
      created_at: "2026-07-01T00:00:00.000Z"
    },
    {
      id: "prof-pat-1",
      user_id: "patient-123",
      email: "budi@kitadeteksi.com",
      password: "password",
      role: "patient",
      full_name: "Budi Santoso",
      phone_number: "+62-812-222-3334",
      regimen: "Fluoxetine 20mg 1x per hari (Pagi hari sesudah makan)",
      is_verified: true,
      created_at: "2026-07-02T00:00:00.000Z"
    },
    {
      id: "prof-pat-2",
      user_id: "patient-456",
      email: "andi@kitadeteksi.com",
      password: "password",
      role: "patient",
      full_name: "Andi Wijaya",
      phone_number: "+62-813-444-5555",
      regimen: "Sertraline 50mg 1x per hari (Malam sebelum tidur)",
      is_verified: true,
      created_at: "2026-07-03T00:00:00.000Z"
    },
    {
      id: "prof-pat-3",
      user_id: "patient-789",
      email: "siti@kitadeteksi.com",
      password: "password",
      role: "patient",
      full_name: "Siti Rahma",
      phone_number: "+62-814-555-6666",
      regimen: "Alprazolam 0.5mg (Bila panik hebat saja, maks 1x sehari)",
      is_verified: true,
      created_at: "2026-07-04T00:00:00.000Z"
    }
  ],
  doctor_patient: [
    {
      id: "dp-1",
      doctor_id: "doctor-123",
      patient_id: "patient-123",
      pairing_code: "X7B9K",
      created_at: "2026-07-02T01:00:00.000Z"
    },
    {
      id: "dp-3",
      doctor_id: "doctor-123",
      patient_id: "patient-789",
      pairing_code: "X7B9K",
      created_at: "2026-07-04T01:00:00.000Z"
    }
  ],
  journals: [
    {
      id: "j-1",
      patient_id: "patient-123",
      content: "Tidur cuma 5 jam, merasa agak lelah tapi tetap fokus bekerja.",
      mood_scale: 6,
      created_at: "2026-07-06T08:00:00.000Z"
    },
    {
      id: "j-2",
      patient_id: "patient-123",
      content: "Sesi relaksasi berjalan lancar. Pikiran terasa lebih tenang hari ini.",
      mood_scale: 7,
      created_at: "2026-07-07T08:00:00.000Z"
    },
    {
      id: "j-3",
      patient_id: "patient-123",
      content: "Panik di kantor karena tumpukan tugas mendadak. Kepala mulai pusing dan gemetar.",
      mood_scale: 4,
      created_at: "2026-07-08T08:00:00.000Z"
    },
    {
      id: "j-4",
      patient_id: "patient-789",
      content: "Cemas sekali mendengar kabar keluarga di kampung halaman.",
      mood_scale: 3,
      created_at: "2026-07-07T10:00:00.000Z"
    }
  ],
  screening_results: [
    {
      id: "scr-1",
      patient_id: "patient-123",
      test_type: "dass21",
      raw_scores: { dep: 12, anx: 8, str: 6, answers: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0] },
      dominant_category: "Depresi",
      is_critical: false,
      created_at: "2026-07-05T09:00:00.000Z"
    },
    {
      id: "scr-2",
      patient_id: "patient-789",
      test_type: "dass21",
      raw_scores: { dep: 18, anx: 16, str: 10, answers: [1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2, 1] },
      dominant_category: "Depresi",
      is_critical: false,
      created_at: "2026-07-07T12:00:00.000Z"
    },
    {
      id: "scr-3",
      patient_id: "patient-789",
      test_type: "phq9",
      raw_scores: { total: 15, answers: [1, 2, 2, 1, 2, 1, 2, 2, 2] }, // Q9 is 2 -> is_critical triggers!
      dominant_category: "Depresi (PHQ-9)",
      is_critical: true,
      created_at: "2026-07-07T12:05:00.000Z"
    }
  ],
  consultation_tickets: [
    {
      id: "tk-001",
      patient_id: "patient-789",
      doctor_id: "doctor-123",
      status: "escalated", // Pre-escalated since Dr Sarah hasn't replied for more than 24h
      sla_deadline: "2026-07-08T12:00:00.000Z", // Dead already since current local time is July 9th!
      created_at: "2026-07-07T12:00:00.000Z"
    },
    {
      id: "tk-002",
      patient_id: "patient-123",
      doctor_id: "doctor-123",
      status: "open",
      sla_deadline: "2026-07-10T11:00:00.000Z", // Has ~23 hours remaining from current local time of July 9th
      created_at: "2026-07-09T11:00:00.000Z"
    }
  ],
  ticket_messages: [
    {
      id: "msg-1",
      ticket_id: "tk-001",
      sender_id: "patient-789",
      message_payload: "Dok, saya gemetar terus sejak kemarin malam dan ada pikiran buruk. Mohon bantuan bimbingannya...",
      created_at: "2026-07-07T12:01:00.000Z"
    },
    {
      id: "msg-2",
      ticket_id: "tk-002",
      sender_id: "patient-123",
      message_payload: "Dok, obat tidur saya tinggal sedikit, apakah dosisnya masih sama?",
      created_at: "2026-07-09T11:02:00.000Z"
    }
  ],
  audit_logs: [
    {
      id: "aud-1",
      user_id: "patient-789",
      action: "SUBMIT_SCREENING_DASS21",
      target_id: "scr-2",
      created_at: "2026-07-07T12:00:00.000Z"
    },
    {
      id: "aud-2",
      user_id: "patient-789",
      action: "SUBMIT_SCREENING_PHQ9_CRITICAL",
      target_id: "scr-3",
      created_at: "2026-07-07T12:05:00.000Z"
    }
  ]
};

export class Database {
  private data: DBStructure;

  constructor() {
    this.data = INITIAL_DB;
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Error reading db file, using initial memory:", e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error saving to db file:", e);
    }
  }

  // --- PROFILES ---
  getProfiles() {
    return this.data.profiles;
  }

  getProfileByUserId(userId: string) {
    return this.data.profiles.find((p) => p.user_id === userId);
  }

  getProfileByEmail(email: string) {
    return this.data.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
  }

  addProfile(profile: Omit<DBProfile, "id" | "created_at">) {
    const newProfile: DBProfile = {
      ...profile,
      is_verified: profile.is_verified !== undefined ? profile.is_verified : (profile.role === "doctor" ? true : false),
      id: `prof-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };
    this.data.profiles.push(newProfile);
    this.save();
    return newProfile;
  }

  updateProfile(userId: string, updates: Partial<DBProfile>) {
    const profile = this.getProfileByUserId(userId);
    if (profile) {
      Object.assign(profile, updates);
      this.save();
    }
    return profile;
  }

  verifyPatient(patientId: string) {
    const profile = this.getProfileByUserId(patientId);
    if (profile) {
      profile.is_verified = true;
      this.save();
    }
    return profile;
  }

  // --- DOCTOR_PATIENT (PAIRINGS) ---
  getPairings() {
    return this.data.doctor_patient;
  }

  getPairingForPatient(patientId: string) {
    return this.data.doctor_patient.find((p) => p.patient_id === patientId);
  }

  getPairedPatientsForDoctor(doctorId: string) {
    const pairings = this.data.doctor_patient.filter((p) => p.doctor_id === doctorId);
    const patientIds = pairings.map((p) => p.patient_id);
    return this.data.profiles.filter((p) => patientIds.includes(p.user_id));
  }

  addPairing(doctorId: string, patientId: string, pairingCode: string) {
    // Prevent duplicate pairing
    const existing = this.data.doctor_patient.find(
      (p) => p.doctor_id === doctorId && p.patient_id === patientId
    );
    if (existing) return existing;

    const newPairing: DBDoctorPatient = {
      id: `dp-${Math.random().toString(36).substr(2, 9)}`,
      doctor_id: doctorId,
      patient_id: patientId,
      pairing_code: pairingCode,
      created_at: new Date().toISOString()
    };
    this.data.doctor_patient.push(newPairing);
    this.save();
    return newPairing;
  }

  removePairing(doctorId: string, patientId: string) {
    const initialLength = this.data.doctor_patient.length;
    this.data.doctor_patient = this.data.doctor_patient.filter(
      (p) => !(p.doctor_id === doctorId && p.patient_id === patientId)
    );
    if (this.data.doctor_patient.length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }


  // --- JOURNALS ---
  getJournalsForPatient(patientId: string) {
    return this.data.journals
      .filter((j) => j.patient_id === patientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addJournal(patientId: string, content: string, moodScale: number) {
    const newJournal: DBJournal = {
      id: `j-${Math.random().toString(36).substr(2, 9)}`,
      patient_id: patientId,
      content,
      mood_scale: moodScale,
      created_at: new Date().toISOString()
    };
    this.data.journals.push(newJournal);
    this.save();
    return newJournal;
  }

  // --- SCREENING RESULTS ---
  getScreeningsForPatient(patientId: string) {
    return this.data.screening_results
      .filter((s) => s.patient_id === patientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addScreeningResult(result: Omit<DBScreeningResult, "id" | "created_at">) {
    const newResult: DBScreeningResult = {
      ...result,
      id: `scr-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };
    this.data.screening_results.push(newResult);
    this.save();
    return newResult;
  }

  // --- CONSULTATION TICKETS ---
  getTickets() {
    return this.data.consultation_tickets;
  }

  getTicketsForPatient(patientId: string) {
    return this.data.consultation_tickets
      .filter((t) => t.patient_id === patientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getTicketsForDoctor(doctorId: string) {
    return this.data.consultation_tickets
      .filter((t) => t.doctor_id === doctorId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getTicketById(id: string) {
    return this.data.consultation_tickets.find((t) => t.id === id);
  }

  addTicket(patientId: string, doctorId: string) {
    // If patient already has a ticket with this doctor (resolved or not), return it to keep a single persistent chat room
    const existing = this.data.consultation_tickets.find(
      (t) => t.patient_id === patientId && t.doctor_id === doctorId
    );
    if (existing) return existing;

    const newTicket: DBConsultationTicket = {
      id: `tk-${Math.random().toString(36).substr(2, 9)}`,
      patient_id: patientId,
      doctor_id: doctorId,
      status: "open",
      // SLA deadline is 24 hours from now
      sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };
    this.data.consultation_tickets.push(newTicket);
    this.save();
    return newTicket;
  }

  updateTicketStatus(ticketId: string, status: "open" | "escalated" | "resolved") {
    const ticket = this.getTicketById(ticketId);
    if (ticket) {
      ticket.status = status;
      this.save();
    }
    return ticket;
  }

  // --- TICKET MESSAGES ---
  getMessagesForTicket(ticketId: string) {
    return this.data.ticket_messages
      .filter((m) => m.ticket_id === ticketId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  addTicketMessage(ticketId: string, senderId: string, messagePayload: string) {
    const newMsg: DBTicketMessage = {
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      ticket_id: ticketId,
      sender_id: senderId,
      message_payload: messagePayload,
      created_at: new Date().toISOString()
    };
    this.data.ticket_messages.push(newMsg);

    // Update ticket status or reset SLA deadline if appropriate
    const ticket = this.getTicketById(ticketId);
    if (ticket) {
      const senderProfile = this.getProfileByUserId(senderId);
      if (senderProfile?.role === "doctor") {
        // If doctor replies, resolve escalation and set status back to open (or keep open), and reset SLA deadline
        ticket.status = "open";
        ticket.sla_deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else {
        // If patient sends message, we preserve status or keep active
      }
    }

    this.save();
    return newMsg;
  }

  // --- AUDIT LOGS ---
  getAuditLogs() {
    return this.data.audit_logs;
  }

  addAuditLog(userId: string, action: string, targetId?: string) {
    const log: DBAuditLog = {
      id: `aud-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      action,
      target_id: targetId,
      created_at: new Date().toISOString()
    };
    this.data.audit_logs.push(log);
    this.save();
    return log;
  }

  // --- CRON SLA CHECK ---
  checkSLADeadlines() {
    let escalatedCount = 0;
    const now = new Date();
    this.data.consultation_tickets.forEach((ticket) => {
      if (ticket.status === "open" && new Date(ticket.sla_deadline) < now) {
        ticket.status = "escalated";
        escalatedCount++;
        // Add audit log
        this.addAuditLog("system", "AUTO_ESCALATED_TICKET", ticket.id);
      }
    });
    if (escalatedCount > 0) {
      this.save();
    }
    return escalatedCount;
  }
}

export const db = new Database();
