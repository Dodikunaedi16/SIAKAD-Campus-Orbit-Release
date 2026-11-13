# Campus Orbit · Release validation

**Status: Kandidat rilis kode, BELUM final terverifikasi.** Paket ini tidak boleh dipakai dengan data mahasiswa asli sebelum lulus build, pengujian, evaluasi keamanan, dan migrasi yang disetujui.

## Perubahan dari MVP
- Model `Grade` untuk nilai akhir dengan unique student/class.
- Endpoint dosen/admin `POST /api/v1/grades`, `GET /api/v1/grades/class/:classId`.
- Endpoint mahasiswa `GET /api/v1/grades/transcript/me`: transkrip dan IPK sederhana. Skala huruf merupakan **contoh**, wajib disesuaikan dengan peraturan kampus.
- Compose produksi dengan Postgres privat, API, Web, Caddy HTTPS dan environment eksternal.

## Pengujian yang berhasil dilakukan di lingkungan pembuat
- Keberadaan source dan pengarsipan diperiksa; file teks/JSON dicek format dasarnya.

## Pengujian yang BELUM berhasil dilakukan
- npm dependency install; registry.npmjs.org gagal DNS (`EAI_AGAIN`).
- Prisma validate/generate/migrasi, NestJS build, Next.js build, Flutter analyze/build APK, dan E2E QR tidak dapat dinyatakan PASS.
- Docker Engine dan Flutter SDK tidak tersedia di lingkungan pembuat.

## Jalankan di Windows dengan Node 22, Docker aktif
```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
# Atur JWT_SECRET, ADMIN_PASSWORD, DEMO_PASSWORD dan database connection di .env
docker compose up -d
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run build
npm run dev:api
# Terminal lain: npm run dev:web
```

## Pra-deployment wajib
- Terapkan autentikasi cookie HttpOnly/refresh token berotasi dan audit keamanan sebelum publik.
- Ubah model kelas/semester, aturan SKS dan grading sesuai aturan institusi.
- Buat migration Prisma yang ditinjau dan backup, jangan gunakan `db push` di produksi.
- Uji Caddy, Dockerfile, variable build Web, jaringan dan healthcheck pada VPS staging.
- Validasi semua role, input nilai hanya dosen pengampu, presensi token kadaluarsa, transaksi concurrent, keamanan PII.
- Bangun APK Flutter dan uji scanner di perangkat fisik.
