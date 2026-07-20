-- Buat tabel Profil (Pengguna)
CREATE TABLE public.profiles (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'developer')),
    is_verified BOOLEAN DEFAULT false,
    phone_number TEXT,
    birth_date TEXT,
    specialization TEXT,
    regimen TEXT DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Buat tabel Penautan (Pairing) antara Pasien dan Dokter
CREATE TABLE public.pairings (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    doctor_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Buat tabel Jurnal Harian
CREATE TABLE public.journals (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mood_scale INTEGER NOT NULL CHECK (mood_scale >= 1 AND mood_scale <= 10),
    ai_summary TEXT,
    ai_sentiment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Buat tabel Hasil Penapisan (Screening)
CREATE TABLE public.screenings (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    test_type TEXT NOT NULL,
    raw_scores JSONB NOT NULL,
    dominant_category TEXT NOT NULL,
    is_critical BOOLEAN DEFAULT false,
    ai_analysis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Buat tabel Tiket Konsultasi
CREATE TABLE public.tickets (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    doctor_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Buat tabel Pesan dalam Tiket Konsultasi
CREATE TABLE public.ticket_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_ai_summary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan Realtime untuk tabel messages dan tickets (opsional untuk fitur chat realtime)
alter publication supabase_realtime add table public.ticket_messages;
alter publication supabase_realtime add table public.tickets;
