# CakraCRM

CRM untuk **Jendela Cakra Digital**: monorepo dengan backend REST API dan frontend SPA terpisah, siap di-deploy ke Render lewat Blueprint (`render.yaml`).

```
CakraCRM/
├── render.yaml            # Infrastructure as Code (Postgres + API + Static Site)
├── backend/               # Express 5 + TypeScript + Prisma (PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/    # dijalankan otomatis oleh `prisma migrate deploy`
│   │   └── seed.ts        # data demo (khusus development)
│   └── src/
│       ├── config/env.ts  # validasi env dengan Zod (gagal start bila salah)
│       ├── lib/           # prisma, JWT, cookie, argon2, helper akses
│       ├── middleware/    # authenticate, authorize (RBAC), validate (Zod), rate limit, CSRF, error
│       └── modules/       # auth, users, leads, deals, activities, dashboard
└── frontend/              # React 19 + Vite + Tailwind v4 + shadcn/ui
    └── src/
        ├── lib/api.ts     # Axios + interceptor refresh token
        ├── hooks/         # TanStack Query hooks per modul
        ├── components/    # shadcn/ui, layout, guard, form dialog
        └── pages/         # Login, Dashboard, Leads, Pipeline (Kanban), Aktivitas, Users
```

## Fitur

| Modul | Isi |
|---|---|
| Auth | Login, logout, cek sesi (`/auth/me`), refresh token otomatis, route guard per role |
| Dashboard | Total Leads, Active Deals, Total Revenue, Conversion Rate (won ÷ deal closed), grafik revenue 6 bulan, deal per stage, status leads |
| Leads & Kontak | CRUD, pencarian, filter status, paginasi, halaman detail dengan deal & timeline aktivitas |
| Pipeline | Kanban 6 stage (Lead In → Won/Lost), drag & drop atau dropdown, update optimistis |
| Aktivitas | Call, Meeting, Note, Task, terhubung ke Lead dan/atau Deal; jadwal & status selesai |
| Users (ADMIN) | Tambah user, ubah role, reset password, nonaktifkan akun |

### Hak akses (RBAC)

| Aksi | ADMIN | MANAGER | SALES |
|---|:-:|:-:|:-:|
| Lihat & edit leads/deals | Semua | Semua | Hanya miliknya |
| Assign owner | ✓ | ✓ | – (selalu dirinya) |
| Hapus lead/deal | ✓ | ✓ | – |
| Lihat daftar user | ✓ | ✓ | – |
| Kelola user | ✓ | – | – |

## Keamanan

- **JWT di HTTP-only cookie**: access token 15 menit (`cakra_at`) dan refresh token 7 hari (`cakra_rt`, hanya dikirim ke `/api/auth`). Token tidak pernah bisa dibaca JavaScript.
- **Rotasi refresh token**: setiap refresh token sekali pakai dan disimpan sebagai hash SHA-256. Jika token lama dipakai ulang, semua sesi user dicabut.
- **Argon2id** untuk hash password (parameter OWASP), dengan perbandingan dummy agar waktu respons login tidak membocorkan email mana yang terdaftar.
- **Helmet** untuk security header, **express-rate-limit** (500 req/15 menit per IP; login 10 kali gagal/15 menit).
- **CORS dinamis** dari `CLIENT_URL` (bisa lebih dari satu origin, pisahkan dengan koma).
- **Proteksi CSRF**: request yang mengubah data wajib membawa header `X-Requested-With`. Browser hanya mengizinkan header itu cross-origin setelah preflight CORS lolos.
- **Validasi Zod `.strict()`** di semua endpoint: key tak dikenal ditolak, string di-trim, panjang dibatasi, email di-lowercase. Body JSON dibatasi 100 KB.

## Development lokal

Prasyarat: Node.js ≥ 20.12 dan PostgreSQL.

```bash
# Backend
cd backend
cp .env.example .env          # isi DATABASE_URL & JWT_SECRET
npm install
npx prisma migrate deploy     # atau `npm run prisma:migrate` saat mengubah schema
npm run seed                  # opsional: data demo
npm run dev                   # http://localhost:4000

# Frontend (terminal lain)
cd frontend
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:4000/api
npm install
npm run dev                   # http://localhost:5173
```

Akun demo hasil seed: `admin@` / `manager@` / `sales@jendelacakra.id`, password `Password123`.

## Deploy ke Render

1. Push repo ini ke GitHub/GitLab.
2. Buat database PostgreSQL gratis di [Neon](https://neon.tech) (region AWS Singapore), lalu salin connection string **direct** (bukan `-pooler`) yang diakhiri `?sslmode=require`. Database ada di luar Render karena Render hanya mengizinkan 1 database gratis per workspace.
3. Di Render: **New → Blueprint**, pilih repo. Render membaca `render.yaml` dan membuat:
   - `cakracrm-backend`: Node web service (`JWT_SECRET` & `JWT_REFRESH_SECRET` di-generate otomatis)
   - `cakracrm-frontend`: static site dengan rewrite SPA
4. Isi `DATABASE_URL` (connection string Neon), `BOOTSTRAP_ADMIN_EMAIL` dan `BOOTSTRAP_ADMIN_PASSWORD`. Akun ADMIN pertama dibuat otomatis saat server pertama kali start (hanya jika tabel `users` kosong), jadi tidak perlu shell access.
5. Cek URL yang diberikan Render. Jika berbeda dari `cakracrm-frontend.onrender.com` / `cakracrm-backend.onrender.com`, perbarui:
   - `CLIENT_URL` di backend → URL frontend (tanpa trailing slash)
   - `VITE_API_BASE_URL` di frontend → `https://<backend>/api`, lalu **redeploy frontend** (variabel Vite dibaca saat build).

### Catatan cookie lintas domain

Di Render, frontend dan backend berada di subdomain `onrender.com` yang berbeda, dan `onrender.com` termasuk *public suffix*. Akibatnya cookie auth dianggap **third-party** dan memakai `SameSite=None; Secure`. Chrome, Edge, dan Firefox saat ini mengizinkannya, tetapi **Safari (dan browser lain yang memblokir third-party cookie) akan menolak cookie tersebut sehingga login gagal**.

Solusi yang direkomendasikan untuk production: pasang custom domain di bawah domain induk yang sama, misalnya:

- Frontend: `crm.jendelacakra.id`
- Backend: `api.crm.jendelacakra.id`

Lalu set `CLIENT_URL=https://crm.jendelacakra.id` dan `COOKIE_SAMESITE=lax` di backend. Cookie kini first-party dan berfungsi di semua browser.

## Environment variables

**Backend**

| Variabel | Wajib | Keterangan |
|---|:-:|---|
| `DATABASE_URL` | ✓ | Connection string PostgreSQL (Neon: direct + `sslmode=require`) |
| `JWT_SECRET` | ✓ | ≥ 32 karakter |
| `JWT_REFRESH_SECRET` | | ≥ 32 karakter; default memakai `JWT_SECRET` |
| `CLIENT_URL` | ✓ | Origin frontend untuk CORS (dipisah koma) |
| `NODE_ENV` | | `production` mengaktifkan cookie `Secure` |
| `PORT` | | Default 4000 (Render mengisi otomatis) |
| `ACCESS_TOKEN_TTL_MINUTES` / `REFRESH_TOKEN_TTL_DAYS` | | Default 15 / 7 |
| `COOKIE_SAMESITE` / `COOKIE_DOMAIN` | | Override atribut cookie (lihat catatan di atas) |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` / `BOOTSTRAP_ADMIN_NAME` | | Akun ADMIN pertama |

**Frontend**

| Variabel | Keterangan |
|---|---|
| `VITE_API_BASE_URL` | Base URL API termasuk `/api` |

## Ringkasan API

Semua endpoint di bawah prefix `/api`. Selain `/auth/login`, `/auth/refresh`, dan `/auth/logout`, semuanya butuh sesi aktif.

```
POST   /auth/login            POST /auth/refresh       POST /auth/logout     GET /auth/me
GET    /dashboard/summary
GET    /leads?search=&status=&page=&pageSize=&sortBy=&sortOrder=
GET    /leads/:id             POST /leads              PATCH /leads/:id      DELETE /leads/:id
GET    /deals?search=&stage=&leadId=
GET    /deals/:id             POST /deals              PATCH /deals/:id      PATCH /deals/:id/stage   DELETE /deals/:id
GET    /activities?leadId=&dealId=&type=&status=open|completed&page=
POST   /activities            PATCH /activities/:id    DELETE /activities/:id
GET    /users                 POST /users              PATCH /users/:id
GET    /health                (di luar /api, untuk health check Render)
```
