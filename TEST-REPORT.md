# TEST-REPORT — SIAKAD Campus Orbit

Tanggal: 13 November 2026 (Asia/Jakarta). Pengujian terhadap proyek yang sama dan PostgreSQL yang dikonfigurasi di apps/api/.env. Semua akun tambahan adalah simulasi dengan domain example.invalid; password acak hanya disimpan pada .env.simulation yang diabaikan Git.

## Ringkasan aktual

- 50 pengujian integrasi/regresi API, PostgreSQL dan HTTP web: PASS.
- Prisma validate dan generate: PASS (Prisma Client 6.19.3).
- Migrasi SQL aditif dalam satu transaksi: PASS. Backup sebelum migrasi berhasil dibuat dan dapat dibaca pg_restore --list (23.296 byte).
- Prisma migrate diff database terhadap schema.prisma: PASS, No difference detected.
- Build NestJS dengan Nest CLI: PASS, exit 0, termasuk build terakhir setelah pengetatan transaksi.
- Build Next.js: PASS, termasuk build terakhir setelah seluruh perubahan frontend (exit 0). Route / berukuran 19,5 kB, First Load JS 122 kB.
- Parser/formatter Dart: PASS setelah memperbaiki dua kurung kurawal berlebih yang sudah ada pada ScannerPage dan QrSessionPage. Ini bukan pengganti flutter analyze atau build APK.
- Flutter analyze: BLOCKED lingkungan Windows. dartaotruntime.exe ditolak Windows Application Control saat analysis server dijalankan. Perintah flutter analyze melalui wrapper juga tidak menghasilkan penyelesaian dan dihentikan.
- Flutter build APK: BLOCKED lingkungan. Wrapper tidak selesai; pemanggilan flutter_tools.snapshot memberikan kegagalan akses tulis C:\Users\Masdod\AppData\Roaming\.flutter_tool_state. Tidak ada APK yang berhasil dibuat.
- Uji browser interaktif: BLOCKED. Browser access host unavailable; fallback native Windows tidak dapat memastikan URL browser dan alat menghentikan Computer Use. Login dan pembuatan akun melalui klik dashboard belum terverifikasi.
- Login/scan kamera pada emulator atau perangkat Flutter: BELUM DAPAT DILAKUKAN. Kontrak API yang digunakan Flutter berhasil diuji melalui HTTP; ini tidak diklaim sebagai uji aplikasi Flutter end-to-end.

## Pengujian integrasi aktual

Skrip: scripts/integration.cjs, scripts/integration-extended.cjs, scripts/security-regression.cjs. Hasil mentah lokal berada di test-results/ (diabaikan Git).

| No. | Pengujian | Hasil |
|---|---|---|
| 1 | Admin login | PASS |
| 2 | Create student and linked User atomically | PASS |
| 3 | Student login | PASS |
| 4 | Wrong password rejected | PASS |
| 5 | Duplicate NIM rejected without orphan User | PASS |
| 6 | Duplicate email rejected | PASS |
| 7 | Student cannot choose role | PASS |
| 8 | Student update persists | PASS |
| 9 | Student denied admin API and other student identifiers | PASS |
| 10 | Create lecturer account | PASS |
| 11 | Lecturer update persists | PASS |
| 12 | Create course and unique code | PASS |
| 13 | Update course | PASS |
| 14 | Create and update class | PASS |
| 15 | Schedule overlap rejected | PASS |
| 16 | Invalid schedule rejected | PASS |
| 17 | Student KRS enrollment | PASS |
| 18 | Duplicate KRS rejected | PASS |
| 19 | Student cannot submit other identity | PASS |
| 20 | Student sees only own profile, KRS and classes | PASS |
| 21 | Lecturer sees assigned classes and participants | PASS |
| 22 | Unassigned lecturer denied grades, attendance, participants | PASS |
| 23 | Grade 0..100 validation | PASS |
| 24 | Assigned lecturer records grade | PASS |
| 25 | KHS IPS IPK weighted by valid SKS | PASS |
| 26 | Student denied grade mutation and QR creation | PASS |
| 27 | Open QR and scan via shared Flutter API contract | PASS |
| 28 | Duplicate and invalid QR rejected | PASS |
| 29 | QR rotation revokes previous token | PASS |
| 30 | Attendance history and class recap persisted | PASS |
| 31 | Protected relational deletes rejected | PASS |
| 32 | Unused student CRUD delete | PASS |
| 33 | Unused lecturer, course and class delete | PASS |
| 34 | Password change revokes old JWT | PASS |
| 35 | Logout invalidates JWT server-side | PASS |
| 36 | Missing and invalid JWT rejected | PASS |
| 37 | Direct PostgreSQL read: linked user, bcrypt, enrollment, grade and attendance | PASS |
| 38 | Other student cannot read or modify another student records | PASS |
| 39 | Unregistered student QR rejected; expired token rejected | PASS |
| 40 | Real JWT expiration rejected | PASS |
| 41 | SKS weighted calculation across two courses and ungraded exclusion | PASS |
| 42 | KRS student schedule collision rejected | PASS |
| 43 | KRS credit limit rejected by server | PASS |
| 44 | Password change rejects wrong current password | PASS |
| 45 | Admin KHS matches student KHS | PASS |
| 46 | Database role overrides signed JWT role claim | PASS |
| 47 | Final serializable deletion guard preserves student history | PASS |
| 48 | API responses never expose password hashes | PASS |
| 49 | Final KHS retains weighted 3.60 and excludes ungraded 12 SKS | PASS |
| 50 | Production website HTTP and compiled login markup | PASS |

## Bukti dan batas hasil

Pembuatan mahasiswa mengembalikan Student.userId yang sama dengan User.id dan role MAHASISWA. Uji duplikat NIM menolak operasi dengan 409, lalu memeriksa daftar User dan memastikan email percobaan tidak meninggalkan akun yatim. Pembacaan Prisma langsung dari PostgreSQL mengonfirmasi User, hash bcrypt, Enrollment, Grade dan Attendance setelah operasi REST.

Perhitungan studi diuji dengan 3 SKS A dan 2 SKS B: jumlah SKS dinilai 5, IPS/IPK 3,60. Penambahan KRS 12 SKS tanpa nilai tidak mengubah pembagi KHS. Penambahan 12 SKS berikutnya ditolak batas maksimum 24. Bentrok ruang/dosen dan jadwal mahasiswa diuji terpisah.

JWT yang diklaim berperan ADMIN tetapi terhubung ke akun mahasiswa tetap ditolak API admin karena role diambil ulang dari PostgreSQL. Token dengan exp masa lalu ditolak. Ganti password dan logout mencabut JWT lama. Data pribadi mahasiswa lain, input nilai dosen bukan pengampu, dan QR mahasiswa tanpa KRS ditolak. Rotasi QR membatalkan token sebelumnya; token simulasi yang kedaluwarsa di database juga ditolak.

Pengujian HTTP produksi website mendapatkan status 200 dan markup login. Ini tidak membuktikan navigasi dashboard, formulir, responsivitas atau rendering visual; uji klik browser masih harus dijalankan ketika alat browser berfungsi. Pemilahan menu/dashboard diimplementasikan berdasarkan role hasil /auth/me, tetapi uji pengalihan visual ADMIN/DOSEN/MAHASISWA berstatus belum terverifikasi.

## Perbaikan dan pengulangan

Percobaan pg_dump awal gagal karena parameter Prisma schema pada URL bukan parameter URI PostgreSQL yang diterima pg_dump. Parameter tersebut dihilangkan hanya untuk koneksi backup; DATABASE_URL dan kredensial asli tidak diubah. Backup berikutnya berhasil sebelum migrasi diterapkan.

Node/npm awal tidak ditemukan melalui PATH sesi. Build dijalankan memakai runtime Node yang tersedia dan CLI lokal proyek; tidak ada instalasi proyek baru. Percobaan Nest CLI dengan path relatif dari working directory salah gagal, kemudian diperbaiki memakai path CLI yang benar dan build berhasil.

Rangkaian API pertama sempat gagal karena dijalankan sebelum layanan selesai startup (fetch failed). Setelah layanan siap, seluruh 36 pengujian diulang dan lulus; skrip kini menunggu health endpoint sebelum memulai. Sembilan pengujian lanjutan dan lima regresi juga lulus.

Flutter semula gagal parser pada dua kurung kurawal berlebih. Setelah diperbaiki, dart format lib/main.dart berhasil. Berkas Android yang semula belum lengkap (Gradle, wrapper, MainActivity, resources) dilengkapi dari template Flutter SDK terpasang pada proyek ini. APK dan analyzer tetap belum tervalidasi karena pembatasan lingkungan; tidak ada perubahan Windows Application Control atau permission sistem.

## Keamanan data dan migrasi

Backup: backups/before-academic.dump; kode backend/skema/page sebelum perubahan juga disalin ke backups/. Migrasi: apps/api/prisma/migrations/20261113_academic_roles/migration.sql, dieksekusi psql --single-transaction -v ON_ERROR_STOP=1. Kolom baru ditambahkan dengan default, tanpa drop/reset/truncate. Tidak menghapus database, volume Docker, akun lama, atau mengganti kredensial akun lama. Pengujian hapus hanya menyentuh fixture sementara yang dibuat skrip itu sendiri. Fixture simulasi yang memiliki riwayat akademik dipertahankan.

Database awal tidak memiliki rangkaian migration Prisma; penerapan ini menggunakan SQL aditif terarsip, bukan migrate deploy tanpa baseline. Perlu baseline sebelum memakai alur migrate deploy di lingkungan tersebut. Program studi dosen/mata kuliah lama tetap kosong sampai diisi administrator; endsAt kelas lama mendapat default konservatif 23:59 dan perlu diperbarui sesuai jadwal sebenarnya.

## Pekerjaan verifikasi yang masih diperlukan

1. Jalankan uji browser admin login → Tambah Mahasiswa → login mahasiswa → dashboard/profil/KRS/KHS/transkrip/riwayat; ulangi dengan dosen. Uji API terkait sudah lulus, jalur klik belum.
2. Jalankan flutter analyze dan flutter build apk pada lingkungan yang diizinkan menulis state Flutter dan menjalankan analysis server. Uji login melalui aplikasi Flutter dengan akun simulasi, lalu scan QR menggunakan kamera perangkat/emulator.
3. Uji tampilan desktop/mobile secara visual ketika browser automation tersedia.
4. Neo Feeder tetap simulasi; tidak ada uji pengiriman ke layanan resmi karena koneksi resmi belum dikonfigurasi.

Petunjuk operasi, kebijakan nilai demonstrasi, dan konfigurasi tersedia di ACADEMIC-OPERATIONS.md.

## Verifikasi layanan akhir

Setelah restart build website terakhir: HTTP / = 200; seluruh bundle JavaScript yang direferensikan markup mengembalikan 200. Health API: status ok, database connected. Layanan pengujian berjalan pada http://localhost:3101 dan backend http://localhost:3100/api/v1. Formatter Dart final juga exit 0 dengan 0 perubahan.
