# Skrip database (Supabase)

Semua skrip dijalankan lewat **Supabase → SQL Editor → New query → tempel → Run**.

| File | Kapan dijalankan |
|---|---|
| `01-admin-setup.sql` | Sekali, saat menyiapkan proyek. Membuat peran petugas & aturan akses. Aman dijalankan ulang. |
| `02-nomor-pendaftaran.sql` | Sesudah file 01, dan **setiap kali file ini diperbarui**. Penomoran berkode jurusan (DKV 000–099, RPL 100–199, TKR 200–299, TSM 300–399, TITL 400–499) + pengaman nomor dobel (formulir melewati nomor yang sudah ada di sheet; tombol "Beri nomor baru" di Dashboard). Aman dijalankan ulang. |
| `perawatan/hapus-data-tes.sql` | Hanya **sebelum pendaftaran resmi dibuka**: menghapus akun tes dan mengembalikan nomor ke 000. **Hapus dulu semua baris TES di keempat sheet Google.** Dikunci: bila sudah ada pendaftar asli, penghitung nomor tidak akan dikembalikan. |

> Jangan jalankan `perawatan/hapus-data-tes.sql` setelah pendaftaran resmi dibuka —
> penghitung nomor akan kembali ke awal.

Cek sisa kuota tiap jurusan:

```sql
select jurusan, berikut as terpakai, 100 - berikut as sisa
from public.penghitung_nomor order by jurusan;
```

## Bila ada nomor pendaftaran dobel

Dashboard admin menampilkan kotak merah **"Nomor pendaftaran dobel"**. Pendaftar yang
daftar lebih dulu tetap memegang nomornya; tekan **Beri nomor baru** pada pendaftar
yang belakangan (superadmin/verifikasi). Nomor baru otomatis diganti di keempat sheet,
lalu WhatsApp terbuka dengan pesan siap kirim ke orang tua/siswa.
