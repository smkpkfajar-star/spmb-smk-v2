# Skrip database (Supabase)

Semua skrip dijalankan lewat **Supabase → SQL Editor → New query → tempel → Run**.

| File | Kapan dijalankan |
|---|---|
| `01-admin-setup.sql` | Sekali, saat menyiapkan proyek. Membuat peran petugas & aturan akses. Aman dijalankan ulang. |
| `02-nomor-pendaftaran.sql` | Sekali, sesudah file 01. Membuat penomoran berkode jurusan (DKV 000–099, RPL 100–199, TKR 200–299, TSM 300–399, TITL 400–499). Aman dijalankan ulang. |
| `perawatan/hapus-data-tes.sql` | Hanya **sebelum pendaftaran resmi dibuka**: menghapus akun tes dan mengembalikan nomor ke 000. Hapus dulu baris TES di keempat sheet Google. |

> Jangan jalankan `perawatan/hapus-data-tes.sql` setelah pendaftaran resmi dibuka —
> penghitung nomor akan kembali ke awal.

Cek sisa kuota tiap jurusan:

```sql
select jurusan, berikut as terpakai, 100 - berikut as sisa
from public.penghitung_nomor order by jurusan;
```
