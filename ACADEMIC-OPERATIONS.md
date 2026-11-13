# Campus Orbit — operasi akademik

## Menjalankan aplikasi

Gunakan konfigurasi yang sudah ada di apps/api/.env dan apps/web/.env.local. Tidak ada kredensial akun lama yang diubah. Perintah normal: npm run dev:api dan npm run dev:web. NEXT_PUBLIC_API_BASE harus menunjuk backend yang sesuai; setelah mengubahnya, build ulang Next.js.

Sesi pengujian pengembangan menggunakan backend http://localhost:3100/api/v1 dan website http://localhost:3101. Flutter Android emulator menggunakan --dart-define=API_BASE=http://10.0.2.2:3100/api/v1. Pada perangkat fisik, gunakan alamat backend yang dapat dijangkau perangkat dan konfigurasi HTTPS deployment yang ada.

## Alur administrator

1. Login dengan akun administrator yang sudah ada.
2. Manajemen Mahasiswa → Tambah Mahasiswa. Masukkan NIM, nama, email, program studi dan password awal 12–72 karakter. Server membuat User MAHASISWA dan Student dalam satu nested transaction Prisma.
3. Manajemen Dosen → Tambah Dosen. Buat identitas NIDN dan akun DOSEN. Edit tidak mengubah password akun.
4. Tambah Mata Kuliah, kemudian Kelas & Jadwal. Tahun akademik dan semester membentuk term, misalnya 2026/2027-GANJIL. Isi waktu mulai dan selesai. Bentrok ruang, dosen dan peserta ditolak.
5. KRS / Peserta: pilih mahasiswa dan kelas. Mahasiswa juga dapat mengambil kelas menggunakan sesi sendiri.
6. Nilai & KHS: pilih kelas, muat peserta, simpan nilai. KHS Mahasiswa menyediakan pencarian hasil studi per mahasiswa.
7. Presensi QR: buka pertemuan; QR berlaku 90 detik. Membuka QR baru pada pertemuan yang sama membatalkan token sebelumnya. Riwayat / Rekap Presensi menampilkan catatan yang tersimpan.

## Peran dan keamanan

Role ditentukan akun di PostgreSQL, diverifikasi lagi pada setiap request; tidak ada pemilihan role di login. Mahasiswa memiliki endpoint profil, KRS, transkrip dan presensi yang mengambil identitas dari JWT terverifikasi. Dosen hanya memperoleh kelas dan peserta penugasannya, serta hanya menilai/membuka QR kelas tersebut. Admin diberi kewenangan pengelolaan secara eksplisit. DTO menolak field tambahan. Respons tidak menyertakan passwordHash.

Password bcrypt cost 12; akun baru ditandai mustChangePassword dan memperoleh pemberitahuan/pengaturan password awal. Logout dan penggantian password menaikkan tokenVersion sehingga seluruh JWT lama akun tersebut tidak berlaku. JWT juga kedaluwarsa setelah dua jam. Website memeriksa /auth/me saat memulihkan sesi dan kembali ke login pada HTTP 401; Flutter menghapus token secure storage dan kembali ke login pada HTTP 401.

## Kebijakan demonstrasi

MAX_KRS_CREDITS (default 24) membatasi total SKS per mahasiswa per term. Mata kuliah yang sama hanya dapat diambil sekali per term. GRADE_RULES berisi daftar JSON ambang nilai, huruf dan bobot; contoh ada pada apps/api/.env.example. Nilai 0–100 dan keanggotaan KRS diperiksa sebelum menyimpan. IPS menghitung seluruh nilai sah dalam satu term dengan pembobotan SKS. IPK menggunakan nilai terbaik per mata kuliah untuk pengambilan ulang. Nilai tanpa KRS atau huruf yang tidak dikenal konfigurasi diabaikan, bukan dianggap nol. Kebijakan ini demonstrasi dan perlu disesuaikan aturan institusi sebelum produksi.

Penghapusan mahasiswa yang memiliki KRS/nilai/presensi ditolak. Dosen dengan kelas, mata kuliah dengan kelas, kelas dengan peserta/pertemuan, dan KRS dengan nilai/presensi juga dilindungi. Tidak ada cascade pembersihan riwayat melalui dashboard. Akun hanya dapat dihapus bersamaan dengan profil yang belum memiliki relasi akademik. Manajemen Akun menampilkan akun tanpa hash; identitas diedit melalui modul Mahasiswa/Dosen. Tidak tersedia promosi role atau penggantian password akun lain melalui UI.

## Database dan migrasi

Backup sebelum migrasi: backups/before-academic.dump (pg_dump custom format); arsip kode awal backend/skema/page juga di backups/. Direktori ini diabaikan Git karena dapat berisi data sensitif. Jangan membagikannya.

Migrasi aditif apps/api/prisma/migrations/20261113_academic_roles/migration.sql diterapkan dengan psql --single-transaction -v ON_ERROR_STOP=1 setelah backup. Tidak menggunakan migrate reset, penghapusan volume, atau accept-data-loss. Database lama menggunakan db push tanpa riwayat migrasi Prisma; SQL ini dapat dijalankan ulang (IF NOT EXISTS). Jangan menjalankan migrate deploy pada database lama sebelum membuat baseline migrasi yang sesuai. Hasil migrate diff setelah penerapan: No difference detected.

Kolom program pada dosen/mata kuliah lama diisi string kosong karena data aslinya tidak diketahui. endsAt kelas lama memakai 23:59 secara konservatif; administrator perlu mengisi jam selesai yang benar melalui Edit Kelas sebelum mengatur jadwal yang bertumpang tindih. Akun lama tidak dipaksa mengganti kredensial.

## Pengujian ulang

Jalankan API terlebih dahulu, lalu node scripts/integration.cjs dan node scripts/integration-extended.cjs secara berurutan terhadap database pengembangan yang dikonfigurasi. Skrip menambah fixture simulasi bertanda SIM/WEIGHT/SKS/TIME, tidak memakai data pribadi asli. Skrip kedua bergantung hasil pertama dan ditujukan satu kali per rangkaian baru. Fixture dengan riwayat akademik sengaja dipertahankan. Hanya fixture sementara yang dibuat skrip itu sendiri dan tidak memiliki relasi yang dihapus.

Akun mahasiswa simulasi dan password acak tersimpan pada .env.simulation (diabaikan Git). Gunakan SIMULATION_PASSWORD_CURRENT setelah pengujian ganti password. Jangan salin password ke laporan. Lihat TEST-REPORT.md untuk hasil aktual dan keterbatasan pengujian browser/Flutter.

Neo Feeder tetap mode simulasi yang dinyatakan secara jelas; koneksi resmi belum dikonfigurasi.

Berkas build Android ditambahkan dari template Flutter SDK terpasang (AGP 9.3.1, Gradle 9.5.0). Konfigurasi release masih memakai signing debug untuk pengujian lokal sesuai template SDK; atur signing institusi sebelum distribusi produksi. Build APK belum tervalidasi; lihat laporan.
