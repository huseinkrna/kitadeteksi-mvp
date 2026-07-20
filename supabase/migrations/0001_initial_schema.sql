-- Migration 0001: Initial schema for KITADETEKSI

-- Create Role Type / Enum
CREATE TYPE user_role AS ENUM ('patient', 'doctor');
CREATE TYPE ticket_status AS ENUM ('open', 'escalated', 'resolved');
CREATE TYPE screening_test_type AS ENUM ('dass21', 'phq9', 'gad7');

-- PROFILES (representing the user profile linked to Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'patient',
    full_name VARCHAR NOT NULL,
    phone_number VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- DOCTOR_PATIENT (pairing relationship)
CREATE TABLE doctor_patient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    pairing_code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (doctor_id, patient_id)
);

-- JOURNALS
CREATE TABLE journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mood_scale INT NOT NULL CHECK (mood_scale >= 1 AND mood_scale <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SCREENING_RESULTS
CREATE TABLE screening_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    test_type screening_test_type NOT NULL,
    raw_scores JSONB NOT NULL, -- e.g. {"dep": 10, "anx": 5, "str": 8} or for phq9: {"total": 12}, etc.
    dominant_category VARCHAR NOT NULL, -- "Depresi", "Kecemasan", "Stres", "Normal"
    is_critical BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CONSULTATION_TICKETS
CREATE TABLE consultation_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    status ticket_status NOT NULL DEFAULT 'open',
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TICKET_MESSAGES
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES consultation_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    message_payload TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AUDIT_LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    action VARCHAR NOT NULL, -- e.g. "VIEW_RECORD", "SUBMIT_SCREENING"
    target_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ROW LEVEL SECURITY (RLS) Enable
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- Profiles: Users can select/update their own profile, doctors can view their paired patients' profiles
CREATE POLICY "Users can manage their own profiles" ON profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view paired patients profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM doctor_patient 
            WHERE doctor_patient.doctor_id = auth.uid() AND doctor_patient.patient_id = profiles.user_id
        )
    );

-- Doctor_patient
CREATE POLICY "Users can view their pairing details" ON doctor_patient
    FOR SELECT USING (auth.uid() = doctor_id OR auth.uid() = patient_id);

-- Journals
CREATE POLICY "Patients can manage their own journals" ON journals
    FOR ALL USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view paired patients journals" ON journals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM doctor_patient 
            WHERE doctor_patient.doctor_id = auth.uid() AND doctor_patient.patient_id = journals.patient_id
        )
    );

-- Screening results
CREATE POLICY "Patients can view/insert their own screening results" ON screening_results
    FOR ALL USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view paired patients screening results" ON screening_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM doctor_patient 
            WHERE doctor_patient.doctor_id = auth.uid() AND doctor_patient.patient_id = screening_results.patient_id
        )
    );

-- Consultation tickets
CREATE POLICY "Patients and doctors can view/manage their tickets" ON consultation_tickets
    FOR ALL USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- Ticket messages
CREATE POLICY "Patients and doctors can manage ticket messages" ON ticket_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM consultation_tickets 
            WHERE consultation_tickets.id = ticket_messages.ticket_id 
              AND (consultation_tickets.patient_id = auth.uid() OR consultation_tickets.doctor_id = auth.uid())
        )
    );

-- Audit logs
CREATE POLICY "Users can see their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);
