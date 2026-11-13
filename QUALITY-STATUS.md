# Status pemeriksaan proyek Campus Orbit

## Hasil terverifikasi pada lingkungan pembuat
- ✅ Struktur monorepo baru dibuat terpisah dari proyek sebelumnya.
- ✅ Source Web Next.js/TypeScript, API NestJS/Prisma, Flutter/Dart dibuat.
- ✅ Seluruh berkas TypeScript/TSX yang diperiksa lolos pengecekan *syntax transpilation* oleh TypeScript.
- ✅ Arsip ZIP diuji integritasnya menggunakan `unzip -t`.
- ⚠️ Instalasi dependensi npm: tidak dapat dijalankan karena registry.npmjs.org mengembalikan EAI_AGAIN.
- ⚠️ Build Web/API: belum dapat dijalankan tanpa pemasangan dependensi.
- ⚠️ Prisma validate/generate/migration dan integrasi PostgreSQL: belum dijalankan.
- ⚠️ Flutter analyze/build APK: belum dijalankan karena Flutter SDK tidak tersedia.
- ⚠️ Uji UI Chromium: browser di lingkungan ini diblokir dari akses URL lokal dan `file://`.

## Cakupan aktual
- Login JWT dasar, peran admin/dosen/mahasiswa, data mahasiswa, katalog mata kuliah, kelas, pendaftaran kelas sederhana, presensi QR berumur 90 detik, data simulasi Neo Feeder.
- Dashboard Web responsif dan aplikasi Android Flutter dalam bentuk source code.
- Modul produksi lengkap (KHS, nilai, audit log, refresh token, pembayaran, PDDikti resmi) **belum tersedia**.
- Tampilan `DESAIN-PREVIEW.html` adalah preview statis dengan angka fiktif, terpisah dari aplikasi Web.

**Status keseluruhan: starter MVP baru, bukan rilis siap pakai.**
