-- Migration 0002: Monetization & QRIS Schema (Freemium Hook)
-- Poin 9-13: Dompet Token, Transaksi Midtrans/Dummy, dan Sesi Konsultasi 24 Jam
-- Catatan: Menggunakan tipe data TEXT untuk user_id, patient_id, dan doctor_id agar selaras dengan tabel profiles.

-- 1. TABLE WALLETS (Dompet Token Pengguna)
CREATE TABLE IF NOT EXISTS wallets (
    user_id TEXT PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
    token_balance INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABLE TRANSACTIONS (Riwayat Pembelian Token & Status Midtrans/Dummy)
CREATE TABLE IF NOT EXISTS transactions (
    order_id TEXT PRIMARY KEY, -- Contoh: "ORD-1722000000000-XYZ"
    user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    gross_amount INTEGER NOT NULL,
    tokens_added INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'settled', 'failed', 'canceled'
    payment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLE CHAT_SESSIONS (Logika Token Konsultasi 24 Jam)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY, -- Contoh: "chat-1722000000000-XYZ"
    patient_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    doctor_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR WALLETS (Mengizinkan akses semua operasi untuk kemudahan demo & autentikasi sistem)
CREATE POLICY "Enable all for wallets" ON wallets FOR ALL USING (true) WITH CHECK (true);

-- POLICIES FOR TRANSACTIONS
CREATE POLICY "Enable all for transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- POLICIES FOR CHAT_SESSIONS
CREATE POLICY "Enable all for chat_sessions" ON chat_sessions FOR ALL USING (true) WITH CHECK (true);
