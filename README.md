# RUANGTARA - Optimizing Mental Healthcare Through AI Integrated System

RUANGTARA adalah platform kesehatan mental terintegrasi yang menghubungkan pasien dengan dokter pengawas. Platform ini menyediakan fitur penapisan psikologis (DASS-21, PHQ-9, GAD-7) dan jurnal harian yang didukung oleh analisis sentimen berbasis AI (Groq & Gemini).

## 🚀 Fitur Utama
- **Penapisan Psikologis**: Cek kondisi mental menggunakan instrumen standar medis.
- **Jurnal AI**: Catatan harian pasien yang diringkas dan dianalisis sentimennya secara otomatis oleh AI.
- **Sistem Triage Darurat**: Deteksi otomatis untuk pasien dengan tingkat krisis tinggi untuk peringatan darurat ke dokter.
- **Dashboard Dokter & Pasien**: Pemantauan hasil skrining dan tiket konsultasi.

## 🛠️ Tech Stack
- **Frontend**: React.js, Vite, TailwindCSS
- **Backend**: Express.js (dikonfigurasi untuk Serverless Vercel)
- **Database**: Supabase (PostgreSQL)
- **AI Integrations**: Groq SDK 

## 💻 Cara Menjalankan Secara Lokal (Local Development)

1. **Clone repository ini**
   ```bash
   git clone https://github.com/huseinkrna/ruangtara-mvp.git
   cd ruangtara-mvp
   ```

2. **Install Dependensi**
   ```bash
   npm install
   ```

3. **Atur Environment Variables**
   Buat file `.env` di *root directory* dan masukkan kunci API berikut:
   ```env
   SUPABASE_URL=https://[PROJECT_ID].supabase.co
   SUPABASE_ANON_KEY=[YOUR_SUPABASE_ANON_KEY]
   GROQ_API_KEY=[YOUR_GROQ_API_KEY]
   ```

4. **Jalankan Aplikasi**
   ```bash
   npm run dev
   ```
   Buka browser dan akses `http://localhost:3000`.

## 🌐 Deployment (Vercel)
Proyek ini sudah dikonfigurasi untuk langsung di-*deploy* ke **Vercel** menggunakan `vercel.json` dan folder `api/`.
1. Import repository ini ke **Vercel**.
2. Vercel akan otomatis mengenali *Framework Preset* sebagai **Vite**.
3. Tambahkan konfigurasi dari `.env` ke bagian **Environment Variables**.
4. Klik **Deploy**!
