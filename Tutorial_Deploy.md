# Tutorial Deploy Web KITADETEKSI (Gratis)

Dokumen ini berisi panduan terperinci langkah demi langkah untuk mengonlinekan aplikasi web KITADETEKSI Anda menggunakan layanan gratis (masa percobaan), serta panduan pengelolaan *repository* (penyimpanan kode).

---

## 1. Persiapan Repository (GitHub)

Sebelum aplikasi bisa di-deploy, Anda harus mengunggah (*push*) kode Anda ke GitHub. Namun, **TIDAK SEMUA FILE** boleh diunggah.

### 🟢 YANG BOLEH (WAJIB) DI-UPLOAD:
*   `src/` (Folder berisi kode React, komponen, dan utilitas).
*   `public/` (Folder berisi aset publik seperti gambar, logo, ikon).
*   `package.json` & `package-lock.json` (Daftar *library* yang dibutuhkan aplikasi).
*   `vite.config.ts`, `tsconfig.json`, `tailwind.config.js` (File konfigurasi aplikasi).
*   `server.ts` (File server Express / *Backend*).
*   `index.html` (File utama *Frontend*).

### 🔴 YANG **TIDAK BOLEH** DI-UPLOAD (HARUS MASUK `.gitignore`):
*   `node_modules/` (Ukurannya sangat besar, server *cloud* akan mengunduhnya sendiri nanti).
*   `.env` atau file rahasia lainnya (Berisi API Key, Token Rahasia, atau *password* database. Jika bocor, sistem Anda bisa diretas. Nilai `.env` nanti akan diisi langsung lewat panel *dashboard server cloud*).
*   `dist/` atau `build/` (Ini adalah hasil *build* yang akan di-*generate* ulang oleh server).
*   `.DS_Store` atau file sistem lokal lainnya.

**Catatan Khusus untuk `db.json`:**
Karena aplikasi ini masih dalam fase MVP dan menggunakan file `db.json` sebagai *database* lokal, Anda BOLEH menguploadnya sebagai *seed* (data awal). **Namun**, perhatikan catatan pada bagian keterbatasan di bawah.

---

## 2. Keterbatasan Hosting Gratis untuk `db.json`

Aplikasi web modern (*serverless* atau *cloud container* gratis seperti Vercel atau Render) memiliki sifat **Ephemeral (Fana)**.
Artinya, setiap kali server *restart* (biasanya setiap hari atau saat tidak ada interaksi), sistem akan mengembalikan folder ke wujud aslinya seperti di GitHub.
*   **Dampaknya:** Data pasien atau jurnal baru yang disimpan ke dalam `db.json` akan **HILANG** dan kembali ke data bawaan saat server tidur/mati.
*   **Solusi Jangka Panjang:** Jika ingin data permanen secara gratis, Anda nantinya perlu mengganti `db.json` dengan database *cloud* gratis seperti **MongoDB Atlas** atau **Supabase**.

Namun, untuk sekadar presentasi atau *trial* demo kepada dosen/penguji, *deploy* ini sudah lebih dari cukup!

---

## 3. Langkah-Langkah Deploy ke Render (Paling Cocok untuk Node.js Express)

**Render.com** adalah salah satu penyedia server gratis terbaik untuk aplikasi *Full-Stack* (React + Node.js) dalam satu tempat.

### Langkah 1: Push ke GitHub
1. Buat akun di [GitHub](https://github.com/).
2. Buat *Repository* baru (Public atau Private).
3. Buka Terminal/Command Prompt di folder `KITADETEKSI`, jalankan urutan perintah berikut:
   ```bash
   git init
   git add .
   git commit -m "Initial commit MVP KitaDeteksi"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO_ANDA.git
   git push -u origin main
   ```

### Langkah 2: Buat Akun Render
1. Kunjungi [Render.com](https://render.com/) dan daftar menggunakan akun GitHub Anda.
2. Setelah masuk ke *Dashboard*, klik tombol **"New +"** dan pilih **"Web Service"**.

### Langkah 3: Konfigurasi Web Service
1. Pilih opsi **"Build and deploy from a Git repository"**, klik *Next*.
2. Hubungkan (*Connect*) akun GitHub Anda, lalu pilih *repository* `KITADETEKSI` yang baru saja Anda buat.
3. Isi konfigurasi berikut pada halaman pengaturan:
   *   **Name:** kitadeteksi-app
   *   **Region:** Singapore (Atau region mana saja yang terdekat).
   *   **Branch:** main
   *   **Runtime:** Node
   *   **Build Command:** `npm install && npm run build` *(Ini akan menginstal dependensi dan mem-build React Anda).*
   *   **Start Command:** `npm run start` atau `npx tsx server.ts` *(Ini adalah perintah untuk menyalakan server Express).*
4. Di bagian **Instance Type**, pastikan Anda memilih **Free** ($0/month).
5. (Opsional) Jika Anda punya variabel rahasia, klik **Advanced** dan masukkan di *Environment Variables*.
6. Klik **"Create Web Service"**.

### Langkah 4: Tunggu Proses Build
*   Render akan membutuhkan waktu sekitar 2 - 5 menit untuk mengunduh kode Anda, menjalankan *build*, dan menyalakan *server*.
*   Anda bisa melihat log di layar hitam yang disediakan. Jika muncul tulisan `Server running on 0.0.0.0:3000`, artinya *deploy* berhasil.

### Langkah 5: Akses Aplikasi Anda
Di pojok kiri atas *dashboard* Render Anda, akan muncul *link/URL* publik (contoh: `https://kitadeteksi-app.onrender.com`).
Klik tautan tersebut, dan Web KITADETEKSI Anda kini sudah *online* dan bisa diakses oleh siapa saja lewat *smartphone* maupun laptop!

---
*Semoga berhasil mengudara! Jika Anda ingin meningkatkannya menjadi produksi skala besar (skripsi/bisnis), direkomendasikan untuk beralih menggunakan Database Cloud dan membeli Domain .com.*
