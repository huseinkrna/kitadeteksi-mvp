export interface Profile {
  id: string;
  user_id: string;
  email: string;
  password?: string;
  role: "patient" | "doctor" | "developer";
  full_name: string;
  phone_number: string;
  birth_date?: string;
  pairing_code?: string;
  regimen?: string;
  specialization?: string;
  is_verified?: boolean;
  created_at: string;
}

export interface Medication {
  id: string;
  obat: string;
  dosis: string;
  waktu_minum: string;
  status: string;
}

export interface DoctorPatient {
  id: string;
  doctor_id: string;
  patient_id: string;
  pairing_code: string;
  created_at: string;
}

export interface Journal {
  id: string;
  patient_id: string;
  content: string;
  mood_scale: number;
  created_at: string;
}

export interface ScreeningResult {
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
  dominant_category: string;
  is_critical: boolean;
  created_at: string;
}

export interface ConsultationTicket {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: "open" | "escalated" | "resolved";
  sla_deadline: string;
  created_at: string;
  // enriched fields
  patient_name?: string;
  patient_email?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  target_id?: string;
  created_at: string;
}

export interface PatientEnrichedProfile extends Profile {
  riskLevel: "Rendah" | "Sedang" | "Tinggi";
  latestScreening?: ScreeningResult;
}

// Safely parse serialized regimen JSON into structured Medication objects
export function parseRegimen(regimenStr?: string): Medication[] {
  if (!regimenStr) return [];
  try {
    const trimmed = regimenStr.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, idx: number) => ({
          id: item.id || `med-${idx}-${Date.now()}`,
          obat: item.obat || item.nama || "",
          dosis: item.dosis || "",
          waktu_minum: item.waktu_minum || item.waktu || "",
          status: item.status || "Aktif",
        }));
      }
    }
  } catch (e) {
    console.warn("Failed to parse regimen JSON, falling back to legacy text:", e);
  }
  return [{ id: "legacy", obat: regimenStr, dosis: "-", waktu_minum: "-", status: "Aktif" }];
}
