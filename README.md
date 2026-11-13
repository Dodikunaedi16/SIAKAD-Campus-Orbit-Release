# Campus Orbit · SIAKAD Next Generation

Monorepo baru dan independen: Next.js Web (port 3001), NestJS API (port 3000), PostgreSQL (host port 5433), dan Flutter Android.

> **STATUS**: Kandidat rilis kode dengan modul nilai/transkrip sederhana,, belum diuji build dalam lingkungan pembuatan karena npm registry tidak dapat diakses dan Flutter SDK tidak tersedia. BUKAN aplikasi siap produksi. Neo Feeder masih mock. Modul nilai, KHS, transkrip, manajemen pengguna lengkap, dan deployment produksi belum selesai.

## Desain

Identitas visual **Campus Orbit**: dark navy, electric lime, violet, tipografi Space Grotesk, dashboard futuristis. Tidak menyalin proyek Codex sebelumnya.

## Prasyarat Windows

Node.js 22+, npm, Docker Desktop (Engine running), Flutter SDK dan Android SDK (untuk Android).

## Menjalankan Web + API

```powershell
cd siakad-orbit-new
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
notepad apps/api/.env
```

Ubah JWT_SECRET menjadi string acak 32+ karakter, ADMIN_PASSWORD minimal 12 karakter, dan opsional DEMO_PASSWORD minimal 12 karakter jika ingin membuat akun dosen/mahasiswa demo. Jangan publikasikan password.

```powershell
docker compose up -d
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

Buka **dua terminal** dari root proyek:

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

- Web: http://localhost:3001
- API: http://localhost:3000/api/v1/health
- Swagger: http://localhost:3000/api/docs

Login admin dari kredensial `.env`. Jika `DEMO_PASSWORD` diberikan, akun simulasi `dosen@demo.local` dan `mahasiswa@demo.local` menggunakan password tersebut.

## Android

Folder `apps/mobile` memuat kode Flutter dan manifest dasar. Untuk menambahkan file platform Android standar, dari folder tersebut jalankan **sekali** `flutter create --platforms=android .` lalu `flutter pub get` dan `flutter run --dart-define=API_BASE=http://10.0.2.2:3000/api/v1` (emulator Android). Pastikan AndroidManifest memiliki izin kamera dan internet. Perangkat fisik gunakan alamat IP LAN komputer, bukan localhost. Untuk produksi gunakan HTTPS dan hapus `android:usesCleartextTraffic="true"`.

## Pengujian minimal

1. `npm run db:generate` harus sukses.
2. `npm run build -w @orbit/api` harus sukses.
3. `npm run build -w @orbit/web` harus sukses.
4. `/api/v1/health` harus merespons `status: ok`.
5. Admin login dan melihat kelas dari API.
6. Dosen membuat QR, mahasiswa yang terdaftar memindai, database menyimpan sekali.
7. Flutter `flutter analyze` dan `flutter build apk` harus berhasil di lingkungan SDK.

## Batasan dan keamanan

- Login MVP memakai access token tersimpan di localStorage pada Web. Untuk produksi, migrasikan ke sesi cookie HttpOnly/SameSite, refresh token berotasi, CSRF protection yang sesuai, dan mekanisme logout/revocation.
- Belum ada workflow lengkap pembatalan/validasi KRS, reset password, nilai/KHS/transkrip, dan audit logging. QR berumur 90 detik, token acak yang hash-nya disimpan di server.
- `prisma db push` dimaksudkan hanya untuk pengembangan. Produksi harus memakai migration yang ditinjau dan backup.
- Akun dan data simulasi tidak boleh ditafsirkan sebagai data PDDikti resmi.


## Tambahan kandidat rilis

Lihat `RELEASE-VALIDATION.md` untuk daftar fitur, status uji, dan langkah sebelum deployment.
API nilai: `POST /api/v1/grades`, `GET /api/v1/grades/class/:classId`, `GET /api/v1/grades/transcript/me`.
