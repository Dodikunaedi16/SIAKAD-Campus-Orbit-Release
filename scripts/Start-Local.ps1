$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
Set-Location $root
if (!(Test-Path 'apps/api/.env')) { Copy-Item 'apps/api/.env.example' 'apps/api/.env'; Write-Host 'PERHATIAN: edit apps/api/.env dan set JWT_SECRET serta ADMIN_PASSWORD!' -ForegroundColor Yellow; exit 1 }
if (!(Test-Path 'apps/web/.env.local')) { Copy-Item 'apps/web/.env.example' 'apps/web/.env.local' }
docker compose up -d
npm install
npm run db:generate
npm run db:push
Write-Host 'Siapkan DEMO_PASSWORD dan ADMIN_PASSWORD di apps/api/.env, lalu jalankan npm run db:seed' -ForegroundColor Cyan
Write-Host 'Jalankan API: npm run dev:api | WEB: npm run dev:web' -ForegroundColor Green
