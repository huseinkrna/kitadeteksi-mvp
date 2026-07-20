# Demo Web KITADETEKSI

## 1. Pendahuluan
**KITADETEKSI** ("Kita Bantu Deteksi Gejala") adalah sebuah platform *Asynchronous Tele-Psychiatry MVP* yang berfokus pada deteksi, pemantauan, dan manajemen kesehatan mental pasien (terutama terkait Depresi, Kecemasan, dan Stres). Platform ini menghubungkan pasien secara langsung dengan psikiater atau dokter pengawas, memungkinkan observasi berkala tanpa mengharuskan tatap muka langsung setiap saat.

## 2. Role (Peran) dalam Sistem
Terdapat 3 peran (Role) utama yang dapat mengakses sistem ini:

1. **Pasien (Patient)**
   Pengguna utama yang kesehatannya dipantau. Pasien dapat melaporkan kesehariannya, melacak *mood*, melihat resep obat dari dokter, dan menghubungi dokter ketika sedang kambuh atau butuh penanganan.
2. **Dokter / Psikiater (Doctor)**
   Tenaga medis profesional yang mengawasi pasien. Dokter memiliki wewenang untuk melihat seluruh riwayat jurnal pasien, meresepkan regimen pengobatan, dan menanggapi sinyal darurat (tiket konsultasi/eskalasi) dari pasien.
3. **Developer / Super Admin (Developer)**
   Admin sistem yang memiliki kendali penuh terhadap keseluruhan data. Developer bertugas melakukan verifikasi awal pada akun-akun yang baru terdaftar, serta dapat memonitor seluruh kredensial dan basis data pengguna.

---

## 3. Fitur-Fitur Utama

### Fitur Pasien
*   **Beranda Pemantauan (Dashboard):** Menampilkan ringkasan status kesehatan mental, nama dokter pengawas, dan tabel resep obat / regimen medis saat ini (hanya baca).
*   **Jurnal Harian (Daily Journal):** Fitur bagi pasien untuk mencatat suasana hati (skala 1-10) dan cerita singkat keseharian.
*   **Penapisan Klinis Terpadu (DASS-21, PHQ-9, GAD-7):** Fitur pengisian kuesioner psikologi standar global untuk menentukan tingkat keparahan depresi, stres, atau kecemasan.
*   **Grafik Perkembangan (Trend Chart):** Visualisasi kemajuan kondisi mental berdasarkan riwayat skor kuesioner dan *mood* harian.
*   **Chat Konsultasi (Tiket Asinkron):** Ruang komunikasi satu pintu bagi pasien untuk meninggalkan pesan bagi dokter kapan saja, dengan batas *SLA (Service Level Agreement)* waktu respon.
*   **Pengaturan Profil:** Pasien dapat mengubah identitas, tanggal lahir, dan memperbarui kata sandi.

### Fitur Dokter
*   **Manajemen Pasien (Patient Roster):** Dokter dapat melihat daftar seluruh pasien yang berada di bawah pengawasannya.
*   **Intervensi & Regimen Obat:** Dokter berwenang menambah, mengubah dosis, atau menghentikan resep obat pasien. Perubahan akan langsung terlihat di dashboard pasien.
*   **Penanganan Kedaruratan (Emergency Alert):** Apabila pasien membuka tiket dengan status kritis/eskalasi (misalnya tendensi menyakiti diri sendiri), dokter akan mendapat notifikasi merah berkedip ("Tangani Darurat") yang menuntut atensi segera.
*   **Chat Konsultasi:** Dokter dapat membalas pesan pasien secara asinkron atau sinkron.
*   **Penerimaan Pasien Baru:** Dokter dapat menyetujui dan memverifikasi pasien yang mendaftar ke layanannya.

### Fitur Developer (Super Admin)
*   **Verifikasi & Persetujuan Akun:** Developer dapat melihat daftar akun baru (dokter maupun pasien) dan mengaktifkannya (*Approve*).
*   **Audit Log & Data Viewer:** Akses penuh ke mentahan data sistem (*database dump viewer*) untuk keperluan *debugging* dan penelusuran aksi seluruh pengguna.
*   **Manajemen Kredensial Pengguna:** Dapat melihat tabel detail seluruh pengguna, termasuk email, tanggal lahir, dan kata sandi untuk membantu pengguna jika terjadi kendala login ("Lupa Sandi").

---

## 4. Kelebihan dan Kekurangan (Pros & Cons)

### Kelebihan (Kekuatan Utama)
1. **Pemantauan Asinkron yang Efisien:** Mengurangi beban waktu dokter, karena dokter dapat mereview jurnal, hasil kuesioner DASS-21, dan keluhan pasien di waktu senggangnya (kecuali untuk kasus darurat).
2. **Deteksi Krisis Otomatis:** Sistem dibekali pohon keputusan (Decision Tree) yang mampu membaca jika pasien memiliki niat bunuh diri atau keparahan level tinggi melalui kuesioner, dan sistem akan langsung "meneriaki" layar dokter dengan peringatan *Red Alert*.
3. **Data Sentris & Berkelanjutan:** Jurnal dan grafik tren memberikan data objektif pada dokter, tidak sekadar mengandalkan memori pasien saat kunjungan sebulan sekali.
4. **Antarmuka Minimalis (Aesthetic):** Desain menggunakan mode warna kontras dan responsif yang nyaman bagi penderita kecemasan (tidak membebani kognitif), dengan navigasi yang sangat sederhana.

### Kekurangan (Area Pengembangan / Limitasi MVP)
1. **Asumsi Koneksi Stabil:** Sebagai aplikasi web *real-time*, pengguna harus selalu memiliki paket data/internet aktif saat keadaan darurat. Jika internet terputus, pesan krisis mungkin tertunda.
2. **Penyimpanan Lokal Sederhana:** Untuk versi MVP ini, database masih mengandalkan penyimpanan statis JSON/Lokal tanpa *encryption database* end-to-end yang kuat sesuai standar kepatuhan medis global penuh (seperti HIPAA compliance tingkat *enterprise*).
3. **Validasi Obat Manual:** Fitur regimen obat masih bersifat bebas diisi (*free-text*) oleh dokter, belum terintegrasi dengan database *pharmacy* atau sistem peringatan interaksi obat (*Drug-Drug Interaction Checker*).
4. **Komunikasi Terbatas pada Teks:** Sistem chat belum mendukung pengiriman lampiran gambar, *voice note*, atau *video call* langsung di dalam platform.

---

## 5. Struktur Folder dan Penjelasan File (Architecture)

Untuk memudahkan pemahaman saat *deployment* atau pengembangan lanjutan, berikut adalah penjelasan dari *file-file* penting yang ada di dalam *repository*:

### Root Direktori (Folder Utama)
*   `index.html` : Kerangka utama website (halaman *frontend* HTML tempat aplikasi React dimuat).
*   `server.ts` : File otak dari *Backend* (Server Express.js). Menangani API, sistem *login*, *routing* data, validasi, dan integrasi algoritma klinis.
*   `db.json` : Berfungsi sebagai *database* lokal (MVP) yang menyimpan data akun, jurnal, tiket, dan *audit log*.
*   `package.json` : Daftar identitas proyek dan daftar *library/package* yang digunakan, serta perintah-perintah *script* (seperti `npm run dev`).
*   `vite.config.ts` : Konfigurasi untuk Vite (mesin *build* / server pengembangan frontend yang sangat cepat).
*   `tailwind.config.js` & `postcss.config.js` : File konfigurasi untuk mengatur *styling* dan desain visual menggunakan Tailwind CSS.

### Folder `src/` (Source Code Frontend & Logika)
Folder ini adalah inti dari tampilan dan algoritma aplikasi.
*   `App.tsx` : Komponen induk penentu arah (Router). Menentukan apakah pengguna belum *login* (diarahkan ke `AuthPage`) atau sudah (diarahkan ke Dashboard sesuai rolenya).
*   `index.css` : File CSS global untuk mengatur variabel warna, tema (*light/dark*), dan memuat Tailwind CSS.
*   `types.ts` : Definisi tipe data (TypeScript Interfaces) untuk keamanan kode (memastikan data Profil, Jurnal, Tiket memiliki struktur/kolom yang seragam).

### Folder `src/components/` (Antarmuka Pengguna / UI)
*   `AuthPage.tsx` : Halaman Daftar (*Register*) dan Masuk (*Login*), beserta logika tombol Demo.
*   `PatientDashboard.tsx` : Tampilan khusus pasien (pengisian jurnal, kuesioner, kontak dokter).
*   `DoctorDashboard.tsx` : Tampilan khusus psikiater (manajemen pasien, pemberian obat, dan penanganan darurat/Red Alert).
*   `DeveloperDashboard.tsx` : Tampilan khusus admin sistem untuk melihat keseluruhan data pengguna dan memverifikasi akun baru.
*   `Navbar.tsx` : Komponen bilah navigasi di atas layar (logo dan nama peran pengguna saat ini).

### Folder `src/lib/` (Library / Logika Algoritma)
*   `db-server.ts` : Modul pengelola *database*. Bertugas membaca, menulis, dan memproses kueri data ke dalam file `db.json`.
*   `clinical-algorithms/scorer.ts` : File algoritma matematis untuk menghitung skor kuesioner psikologi (seperti DASS-21, PHQ-9, GAD-7) berdasarkan panduan klinis global.
*   `clinical-algorithms/decision-tree.ts` : Algoritma *Decision Tree* otomatis yang akan menentukan tingkat keparahan (Rendah, Sedang, Tinggi, atau Kritis) berdasarkan jawaban pasien, lalu memicu status Eskalasi/Alarm Merah.

---
*Dokumen ini dibuat secara otomatis sebagai ringkasan demonstrasi Web KITADETEKSI.*
