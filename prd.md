# Product Requirement Document (PRD)

**Project:** Serverless Placement Test Engine (Taklim CBT)

**Target Concurrency:** 5.000 Peserta Serentak

**Infrastruktur Budget:** Rp 0 (*Full Free-Tier Optimized*)

**Metode Login:** Model 2 (1 Token Masal + Identitas Mandiri: NIM, Nama, Mabna)

**Manajemen Soal:** Form Builder Web Admin + Fitur Upload Excel/CSV

---

## 1. Ringkasan Eksekutif & Arsitektur Utama

Sistem ini dirancang untuk menggantikan Google Form dengan meniadakan kendala *server crash*, *throttling submit*, dan ketergantungan akun Google. Arsitektur mengadopsi pola **Serverless Jamstack + Edge Caching + Redis Ingestion Buffer**.

```
[ Admin / Ustadz ] ──► [ Input Web Form / Upload Excel ] ──► [ Simpan ke Supabase DB ]
                                                                     │
                                                      ┌──────────────┴──────────────┐
                                                      ▼                             ▼
                                            [ soal-public.json ]          [ kunci_jawaban (Secure) ]
                                            (Ditaruh di Edge Cache)       (Disimpan di Redis/DB)
                                                      │
[ 5.000 Peserta ] ──► [ Login: NIM + Nama + Mabna + Token ] ──► [ Unduh Soal 1x ]
                                                      │
                                           [ Kerjakan (Client-Side) ]
                                           - Timer lokal
                                           - Acak Soal & Opsi (Seed: NIM)
                                           - Save per-klik di localStorage
                                                      │
                                           [ Submit Lembar Jawaban ]
                                           - Injeksi Jitter (0-3s)
                                                      │
                                                      ▼
                                           [ Upstash Redis Queue ] ──► [ Hitung Nilai Pasca-Ujian ]

```

---

## 2. Modul Autentikasi & Akses Peserta (Model 2)

### A. Input Halaman Masuk

Peserta tidak memerlukan registrasi akun satu per satu. Halaman login meminta:

* **Nama Lengkap**
* **NIM (Nomor Induk Mahasiswa)** (Berfungsi sebagai *unique identifier*)
* **Mabna** (*Dropdown Select Box* memuat daftar Mabna/Gedung)
* **Token Ujian Masal** (Contoh: `TAKLIM2026`, token tunggal yang diumumkan panitia sesaat sebelum tes).

### B. Aturan Bisnis & Validasi

1. Token divalidasi instan melalui Environment Variable / Cloudflare KV.
2. **Anti Double-Submit:** 1 NIM hanya memiliki hak 1 kali pengiriman lembar jawaban final (divalidasi melalui Redis Set `submitted_nims`).

---

## 3. Modul Admin: Manajemen Bank Soal

Halaman admin diproteksi password khusus panitia (`/admin`) dengan 2 opsi input data:

### A. Fitur 1: Form Builder Interaktif (Mirip Google Form)

* Input teks pertanyaan.
* Input pilihan ganda (Opsi A, B, C, D).
* Radio button untuk menandai opsi mana yang merupakan kunci jawaban benar.
* Tombol *Tambah Nomor*, *Hapus Nomor*, dan *Urutkan Soal*.

### B. Fitur 2: Upload File Excel / CSV

* Admin dapat mengunduh format template tabel:
`| nomor | pertanyaan | pilihan_a | pilihan_b | pilihan_c | pilihan_d | kunci_jawaban |`
* Fitur *Drag-and-Drop* file `.xlsx` / `.csv`.
* Sistem mem-parsing file di browser/server, menampilkan *preview* soal, serta menjalankan auto-validator schema sebelum disimpan.

### C. Mekanisme Keamanan "Split-Key" saat Publish

Saat admin menekan tombol **"Publish Ujian"**, sistem membagi data menjadi dua:

1. **`soal-public.json`:** Berisi seluruh teks soal dan pilihan A–D **tanpa kunci jawaban**. File ini di-cache di Cloudflare Edge.
2. **`answer-keys`:** Kunci jawaban (`{"1": "A", "2": "C", ...}`) disimpan tertutup di database server/Redis dan tidak pernah terekspos ke browser peserta.

---

## 4. Modul Pengerjaan Ujian (Sisi Peserta)

### A. Pola *Single-Fetch & Client-Side Engine*

* Saat ujian dimulai, seluruh paket soal dimuat **hanya 1 kali** ke browser.
* **Seeded Randomization:** Urutan soal dan pilihan jawaban A-D diacak di browser berdasarkan hash **NIM** peserta sehingga urutan unik per peserta.
* Navigasi antar nomor berjalan instan tanpa mengirim request HTTP ke server.
* Timer ujian berjalan di sisi klien (JavaScript Web Worker).

### B. Ketahanan Data (*Offline Resilience*)

* Setiap kali peserta memilih opsi jawaban, data langsung tersimpan di `localStorage` browser (`cbt_answers_[nim]`).
* Jika browser tidak sengaja tertutup, HP restart, atau koneksi terputus, progres jawaban tetap utuh saat halaman dibuka kembali.

### C. Anti-Cheat & Mitigasi Lonjakan (*Anti-Spike Jitter*)

* **Tab Switch Detection:** Sistem mendeteksi dan mencatat jumlah perpindahan tab/jendela yang dilakukan peserta selama ujian.
* Saat tombol "Selesai" ditekan atau waktu habis, sistem menyisipkan *random delay* antara **0 hingga 3.000 ms** sebelum mengirim payload.

---

## 5. Modul Pengumpulan Jawaban & Rekapitulasi (Serverless Ingestion)

### A. Endpoint Ingestion (`POST /api/exam/submit`)

* Menerima 1 payload JSON utuh per peserta:
```json
{
  "nama": "Ahmad Syahputra",
  "nim": "230101001",
  "mabna": "Al-Farabi",
  "token": "TAKLIM2026",
  "answers": { "1": "A", "2": "B", "3": "D" },
  "tab_switches": 0,
  "duration_seconds": 1800
}
```

* Menulis langsung ke antrean **Upstash Redis** (`LPUSH exam_submission_queue`). Operasi selesai dalam $<30$ ms.

### B. Pengolahan Nilai Pasca-Ujian (*Queue Drainer*)

* Setelah waktu ujian berakhir, admin/panitia menekan tombol **"Tarik & Rekap Nilai"** di dashboard admin.
* Background function membaca antrean dari Redis, mencocokkan jawaban dengan kunci yang tersimpan, menghitung total nilai, lalu menyimpan hasilnya ke database Supabase.
* Rekapitulasi diekspor menjadi file Excel/CSV lengkap dengan **rincian jawaban per nomor** dari tiap peserta (`NIM | Nama | Mabna | Total Skor | Tab Switches | Q1 | Q2 | Q3 ...`).

---

## 6. Rencana Stack Teknologi (100% Free-Tier)

| Layer | Teknologi / Layanan | Alasan Pemilihan |
| --- | --- | --- |
| **Framework** | **Next.js (React)** + Tailwind CSS + XLSX library | Mendukung form builder dinamis dan pembacaan file Excel langsung. |
| **Hosting & API** | **Vercel (Hobby)** / **Cloudflare Pages** | Auto-scale instan tanpa biaya server bulanan. |
| **CDN & Caching** | **Cloudflare Free** | Meng-cache aset statis & file soal agar serverless function tidak overload. |
| **Ingestion Buffer** | **Upstash Redis Free** | Menampung 5.000 submit serentak dalam memori RAM berkecepatan tinggi. |
| **Primary Database** | **Supabase PostgreSQL Free** | Menyimpan arsip bank soal dan hasil rekap akhir peserta. |

---

## 7. Kriteria Keberhasilan (*Acceptance Criteria*)

* [ ] Admin dapat membuat soal lewat form web dan via upload Excel tanpa error parsing.
* [ ] Kunci jawaban terbukti tidak bocor di tab *Network / Elements* browser peserta.
* [ ] Peserta dapat login menggunakan NIM, Nama, Mabna (Dropdown), dan 1 token masal.
* [ ] Urutan soal dan opsi A-D diacak unik per peserta berdasarkan seed NIM.
* [ ] Simulasi load test 5.000 request submit memiliki tingkat kegagalan 0% (*zero 5xx error*).
* [ ] Data jawaban peserta tidak hilang saat browser di-refresh di tengah pengerjaan.
* [ ] Admin dapat mengekspor rekap nilai akhir beserta rincian jawaban per nomor ke format Excel setelah ujian selesai.