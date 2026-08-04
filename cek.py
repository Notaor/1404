#!/usr/bin/env python3
"""
cek.py

Script ini otomatis MENDETEKSI struktur file JSON transaksi yang diberikan,
lalu menghitung ringkasannya. Struktur yang didukung:

1) STRUKTUR "rotio" - list berisi dict, tiap dict punya 1 key (ID transaksi)
   yang isinya dict dengan field "4" sebagai nilai total transaksi:
   [
       {
           "<ID_TRANSAKSI>": {
               "0": "<tanggal>", "1": ..., "2": ..., "3": ...,
               "4": "<nilai_total_transaksi>", "5": ...,
               "detil_item": [...], "outlet": "<nama_outlet>"
           }
       },
       ...
   ]
   Rumus (field "4" = nilai total transaksi, sudah termasuk PPN 11%):
       subtotal = 4 / 1.1
       dpp      = 4 / 1.1
       tax      = 4 / 11
       total    = 4

2) STRUKTUR "kai" - list flat berisi dict transaksi langsung, dengan field
   "biayatotal" sebagai nilai transaksi:
   [
       {
           "kode_lokasi": ..., "nama_lokasi": ..., "kode_cus_out": ...,
           "waktu_out": "<tanggal>", "biayatotal": <nilai>,
           "kode_bank_out": "..."
       },
       ...
   ]
   Yang dihitung: jumlah transaksi, total penjumlahan "biayatotal", serta
   dpp & tax yang diturunkan darinya:
       tax = biayatotal / 11
       dpp = biayatotal - tax

3) STRUKTUR "hokben" - dict pembungkus berisi "count", "data" (list transaksi),
   dan "success". Tiap transaksi punya field "tax" langsung:
   {
       "count": ...,
       "data": [
           {
               "no_transaksi": ..., "trans_date": ..., "jam": ...,
               "gross_sales": ..., "tax": <nilai>, "sub_total": ...,
               "branch_id": ..., ...
           },
           ...
       ],
       "success": true
   }
   Rumus (field "tax" = nilai pajak transaksi, PPN 10%):
       dpp   = (tax / 0.1) - tax
       tax   = tax
       total = tax / 0.1

4) STRUKTUR "kopken" - dict pembungkus berisi "error_code", "error_msg",
   dan "result" (list transaksi). Tiap transaksi sudah punya field "dpp",
   "pajak", dan "total" secara langsung (tidak perlu dihitung ulang):
   {
       "error_code": 0,
       "error_msg": "OK",
       "result": [
           {
               "ID": ..., "waktu_transaksi": ..., "no_struk": ...,
               "dpp": "<nilai>", "discount": ..., "pajak": "<nilai>",
               "service": ..., "total": "<nilai>", "detail": ...,
               "outlet_id": ..., "jenis_pembayaran": ..., "Issuer": ...
           },
           ...
       ]
   }
   Yang dihitung: jumlah transaksi, total "dpp", total "pajak" (sebagai tax),
   dan total "total" (sebagai total keseluruhan) — langsung dijumlahkan
   tanpa rumus tambahan.

5) STRUKTUR "fore" - dict pembungkus berisi "data" (list transaksi) dan
   "execution_time". Tiap transaksi punya field "total" dan "pajak"
   langsung, tetapi TIDAK ada field "dpp":
   {
       "data": [
           {
               "tgl": ..., "counter_id": ..., "counter_name": ...,
               "billing_id": ..., "total": <nilai>, "pajak": <nilai>
           },
           ...
       ],
       "execution_time": "..."
   }
   Rumus:
       tax   = pajak
       total = total
       dpp   = total - pajak

6) STRUKTUR "fave" - dict pembungkus berisi "Success", "Message", "Data"
   (list transaksi), "History", "Total", "DebugInfo". Tiap transaksi punya
   field "base_amount", "service_charge_amount", "tax_amount", dan
   "grand_total" (base_amount + service_charge_amount + tax_amount =
   grand_total):
   {
       "Success": true,
       "Message": "",
       "Data": [
           {
               "transaction_id": ..., "created_date_time": ...,
               "revenue_date": ..., "revenue_center_name": ...,
               "base_amount": <nilai>, "discount": ...,
               "service_charge_amount": <nilai>, "tax_amount": <nilai>,
               "grand_total": <nilai>
           },
           ...
       ],
       "History": null, "Total": ..., "DebugInfo": null
   }
   Rumus (dipetakan langsung dari field yang tersedia):
       dpp   = base_amount
       tax   = tax_amount
       total = grand_total

7) STRUKTUR "sams" - dict pembungkus berisi "code", "msg", "data" (list
   transaksi). Tiap transaksi SUDAH punya field "subtotal", "dpp", "tax",
   dan "total" secara langsung (tidak perlu dihitung ulang):
   {
       "code": 200,
       "msg": "success",
       "data": [
           {
               "id": ..., "no_struk": ..., "date_trans": ...,
               "subtotal": "<nilai>", "service_charge": ..., "discount": ...,
               "dpp": "<nilai>", "tax": "<nilai>", "total": "<nilai>",
               "nama_usaha": ..., ...
           },
           ...
       ]
   }
   Yang dihitung: jumlah transaksi, total "subtotal", "dpp", "tax", dan
   "total" — langsung dijumlahkan tanpa rumus tambahan.

Penggunaan:
    python3 cek.py <path_ke_file.json>          -> hanya tampilkan ringkasan
    python3 cek.py <path_ke_file.json> --csv     -> ringkasan + unduh CSV

Nama file CSV otomatis mengikuti nama file JSON.
Contoh: "rotio.json" --csv akan menghasilkan "rotio.csv".

Jika path tidak diberikan, script akan mencari "rotio.json" di folder yang sama.

MODE TAMBAHAN - LIHAT DAFTAR SEMUA FUNGSI:
    python3 cek.py --fungsi

Menampilkan menu semua fungsi/mode yang tersedia di script ini beserta
contoh perintah bash persis untuk menjalankan masing-masing.

MODE TAMBAHAN - CEK NO STRUK DUPLIKAT:
    python3 cek.py <path_ke_file> --cek-duplikat
    python3 cek.py <path_ke_file> --cek-duplikat --csv

Mode ini TIDAK menghitung transaksi seperti di atas. Sebaliknya, file yang
diberikan dianggap berisi daftar no struk, lalu dicari mana saja no struk
yang MUNCUL LEBIH DARI SEKALI (duplikat). No struk yang unik (hanya muncul
1 kali) tidak ditampilkan. Dua format file didukung:
    1) Teks biasa, satu no struk per baris (boleh berekstensi .json ataupun
       .txt, isinya cukup daftar no struk polos).
    2) JSON array of strings: ["NOSTRUK1", "NOSTRUK2", ...]

MODE TAMBAHAN - BANDINGKAN DUA FILE NO STRUK:
    python3 cek.py <file1> <file2> --bandingkan
    python3 cek.py <file1> <file2> --bandingkan --csv

Kebalikan dari mode --cek-duplikat. Di sini dua file daftar no struk
dibandingkan, lalu no struk yang TIDAK PUNYA PASANGAN di file satunya (hanya
muncul di salah satu file) yang ditampilkan. No struk yang ada di kedua file
(berpasangan) tidak ditampilkan. Format file yang didukung sama seperti mode
--cek-duplikat di atas.
"""

import json
from collections import Counter
import sys
import csv
import argparse
from pathlib import Path


# ============================================================
# DETEKSI STRUKTUR
# ============================================================

def deteksi_struktur(data):
    """
    Mengembalikan tuple (tipe, list_data) dengan tipe salah satu dari
    "rotio", "kai", "hokben", "kopken", "fore", "fave", "sams". Melempar ValueError
    jika tidak dikenali.
    """
    # struktur "fave": dict pembungkus dengan key "Data" berisi list transaksi
    if isinstance(data, dict) and isinstance(data.get("Data"), list):
        daftar = data["Data"]
        if len(daftar) > 0 and isinstance(daftar[0], dict) and "grand_total" in daftar[0] and "tax_amount" in daftar[0]:
            return "fave", daftar
        raise ValueError(
            "Struktur dict dengan key 'Data' ditemukan, tetapi isinya tidak "
            "cocok dengan pola struktur 'fave' (field 'grand_total'/'tax_amount' tidak ditemukan)."
        )

    # struktur "kopken": dict pembungkus dengan key "result" berisi list transaksi
    if isinstance(data, dict) and isinstance(data.get("result"), list):
        daftar = data["result"]
        if len(daftar) > 0 and isinstance(daftar[0], dict) and "dpp" in daftar[0] and "pajak" in daftar[0]:
            return "kopken", daftar
        raise ValueError(
            "Struktur dict dengan key 'result' ditemukan, tetapi isinya tidak "
            "cocok dengan pola struktur 'kopken' (field 'dpp'/'pajak' tidak ditemukan)."
        )

    # struktur "sams" / "hokben" / "fore": dict pembungkus dengan key "data" berisi list transaksi
    if isinstance(data, dict) and isinstance(data.get("data"), list):
        daftar = data["data"]
        if len(daftar) > 0 and isinstance(daftar[0], dict):
            # "sams" dicek lebih dulu karena kombinasi field-nya lebih spesifik
            # (subtotal+dpp+tax+total sekaligus), sedangkan "hokben" hanya
            # mengandalkan field "tax" saja.
            if "subtotal" in daftar[0] and "dpp" in daftar[0] and "tax" in daftar[0] and "total" in daftar[0]:
                return "sams", daftar
            if "tax" in daftar[0]:
                return "hokben", daftar
            if "pajak" in daftar[0] and "total" in daftar[0]:
                return "fore", daftar
        raise ValueError(
            "Struktur dict dengan key 'data' ditemukan, tetapi isinya tidak "
            "cocok dengan pola struktur 'sams' (field 'subtotal'/'dpp'/'tax'/'total'), "
            "'hokben' (field 'tax'), maupun 'fore' (field 'pajak' & 'total')."
        )

    if not isinstance(data, list) or len(data) == 0:
        raise ValueError("Data JSON harus berupa list dan tidak boleh kosong.")

    contoh = data[0]
    if not isinstance(contoh, dict):
        raise ValueError("Setiap elemen list harus berupa object/dict.")

    # struktur "kai": field biayatotal langsung ada di level ini
    if "biayatotal" in contoh:
        return "kai", data

    # struktur "rotio": 1 key (ID transaksi) -> dict berisi field "4"
    if len(contoh) >= 1:
        nilai_pertama = next(iter(contoh.values()))
        if isinstance(nilai_pertama, dict) and "4" in nilai_pertama:
            return "rotio", data

    raise ValueError(
        "Struktur JSON tidak dikenali. Script ini hanya mendukung struktur "
        "'rotio' (field '4'), 'kai' (field 'biayatotal'), 'hokben' "
        "(dict berisi 'data' dengan field 'tax'), 'kopken' (dict berisi "
        "'result' dengan field 'dpp'/'pajak'), 'fore' (dict berisi "
        "'data' dengan field 'pajak'/'total'), 'fave' (dict berisi "
        "'Data' dengan field 'grand_total'/'tax_amount'), atau 'sams' "
        "(dict berisi 'data' dengan field 'subtotal'/'dpp'/'tax'/'total')."
    )


# ============================================================
# STRUKTUR "rotio"
# ============================================================

def hitung_per_transaksi_rotio(nilai_field_4: float) -> dict:
    """Menghitung subtotal, dpp, tax, dan total dari satu nilai field '4'."""
    return {
        "subtotal": nilai_field_4 / 1.1,
        "dpp": nilai_field_4 / 1.1,
        "tax": nilai_field_4 / 11,
        "total": nilai_field_4,
    }


def proses_rotio(data: list):
    detail = []
    total_subtotal = 0.0
    total_dpp = 0.0
    total_tax = 0.0
    total_keseluruhan = 0.0

    for record in data:
        for trx_id, isi in record.items():
            nilai_4 = float(isi.get("4", 0))
            hasil = hitung_per_transaksi_rotio(nilai_4)

            total_subtotal += hasil["subtotal"]
            total_dpp += hasil["dpp"]
            total_tax += hasil["tax"]
            total_keseluruhan += hasil["total"]

            detail.append({
                "id_transaksi": trx_id,
                "tanggal": isi.get("0", ""),
                "outlet": isi.get("outlet", ""),
                "subtotal": hasil["subtotal"],
                "dpp": hasil["dpp"],
                "tax": hasil["tax"],
                "total": hasil["total"],
            })

    ringkasan = {
        "tipe": "rotio",
        "jumlah_transaksi": len(detail),
        "total_subtotal": total_subtotal,
        "total_dpp": total_dpp,
        "total_tax": total_tax,
        "total_keseluruhan": total_keseluruhan,
    }
    return detail, ringkasan


# ============================================================
# STRUKTUR "kai"
# ============================================================

def proses_kai(data: list):
    detail = []
    total_biayatotal = 0.0
    total_dpp = 0.0
    total_tax = 0.0

    for isi in data:
        nilai = float(isi.get("biayatotal", 0))
        tax = nilai / 11
        dpp = nilai - tax

        total_biayatotal += nilai
        total_dpp += dpp
        total_tax += tax

        detail.append({
            "kode_lokasi": isi.get("kode_lokasi", ""),
            "nama_lokasi": isi.get("nama_lokasi", ""),
            "kode_cus_out": isi.get("kode_cus_out", ""),
            "waktu_out": isi.get("waktu_out", ""),
            "biayatotal": nilai,
            "dpp": dpp,
            "tax": tax,
            "kode_bank_out": isi.get("kode_bank_out", ""),
        })

    ringkasan = {
        "tipe": "kai",
        "jumlah_transaksi": len(detail),
        "total_biayatotal": total_biayatotal,
        "total_dpp": total_dpp,
        "total_tax": total_tax,
    }
    return detail, ringkasan


# ============================================================
# STRUKTUR "hokben"
# ============================================================

def proses_hokben(data: list):
    detail = []
    total_dpp = 0.0
    total_tax = 0.0
    total_total = 0.0

    for isi in data:
        tax = float(isi.get("tax", 0))
        total = tax / 0.1
        dpp = total - tax

        total_dpp += dpp
        total_tax += tax
        total_total += total

        detail.append({
            "no_transaksi": isi.get("no_transaksi", ""),
            "trans_date": isi.get("trans_date", ""),
            "jam": isi.get("jam", ""),
            "branch_id": isi.get("branch_id", ""),
            "dpp": dpp,
            "tax": tax,
            "total": total,
        })

    ringkasan = {
        "tipe": "hokben",
        "jumlah_transaksi": len(detail),
        "total_dpp": total_dpp,
        "total_tax": total_tax,
        "total_total": total_total,
    }
    return detail, ringkasan


# ============================================================
# STRUKTUR "kopken"
# ============================================================

def proses_kopken(data: list):
    detail = []
    total_dpp = 0.0
    total_tax = 0.0
    total_total = 0.0

    for isi in data:
        dpp = float(isi.get("dpp", 0))
        tax = float(isi.get("pajak", 0))
        total = float(isi.get("total", 0))

        total_dpp += dpp
        total_tax += tax
        total_total += total

        detail.append({
            "no_struk": isi.get("no_struk", ""),
            "waktu_transaksi": isi.get("waktu_transaksi", ""),
            "outlet_id": isi.get("outlet_id", ""),
            "dpp": dpp,
            "tax": tax,
            "total": total,
            "jenis_pembayaran": isi.get("jenis_pembayaran", ""),
        })

    ringkasan = {
        "tipe": "kopken",
        "jumlah_transaksi": len(detail),
        "total_dpp": total_dpp,
        "total_tax": total_tax,
        "total_total": total_total,
    }
    return detail, ringkasan


# ============================================================
# STRUKTUR "fore"
# ============================================================

def proses_fore(data: list):
    detail = []
    total_dpp = 0.0
    total_tax = 0.0
    total_total = 0.0

    for isi in data:
        total = float(isi.get("total", 0))
        tax = float(isi.get("pajak", 0))
        dpp = total - tax

        total_dpp += dpp
        total_tax += tax
        total_total += total

        detail.append({
            "billing_id": isi.get("billing_id", ""),
            "tgl": isi.get("tgl", ""),
            "counter_name": isi.get("counter_name", ""),
            "dpp": dpp,
            "tax": tax,
            "total": total,
        })

    ringkasan = {
        "tipe": "fore",
        "jumlah_transaksi": len(detail),
        "total_dpp": total_dpp,
        "total_tax": total_tax,
        "total_total": total_total,
    }
    return detail, ringkasan


# ============================================================
# STRUKTUR "fave"
# ============================================================

def proses_fave(data: list):
    detail = []
    total_dpp = 0.0
    total_tax = 0.0
    total_total = 0.0

    for isi in data:
        dpp = float(isi.get("base_amount", 0))
        tax = float(isi.get("tax_amount", 0))
        total = float(isi.get("grand_total", 0))

        total_dpp += dpp
        total_tax += tax
        total_total += total

        detail.append({
            "transaction_id": isi.get("transaction_id", ""),
            "created_date_time": isi.get("created_date_time", ""),
            "revenue_center_name": isi.get("revenue_center_name", ""),
            "dpp": dpp,
            "tax": tax,
            "total": total,
        })

    ringkasan = {
        "tipe": "fave",
        "jumlah_transaksi": len(detail),
        "total_dpp": total_dpp,
        "total_tax": total_tax,
        "total_total": total_total,
    }
    return detail, ringkasan


# ============================================================
# STRUKTUR "sams"
# ============================================================

def proses_sams(data: list):
    detail = []
    total_subtotal = 0.0
    total_dpp = 0.0
    total_tax = 0.0
    total_keseluruhan = 0.0

    for isi in data:
        subtotal = float(isi.get("subtotal", 0))
        dpp = float(isi.get("dpp", 0))
        tax = float(isi.get("tax", 0))
        total = float(isi.get("total", 0))

        total_subtotal += subtotal
        total_dpp += dpp
        total_tax += tax
        total_keseluruhan += total

        detail.append({
            "no_struk": isi.get("no_struk", ""),
            "date_trans": isi.get("date_trans", ""),
            "nama_usaha": isi.get("nama_usaha", ""),
            "subtotal": subtotal,
            "dpp": dpp,
            "tax": tax,
            "total": total,
        })

    ringkasan = {
        "tipe": "sams",
        "jumlah_transaksi": len(detail),
        "total_subtotal": total_subtotal,
        "total_dpp": total_dpp,
        "total_tax": total_tax,
        "total_keseluruhan": total_keseluruhan,
    }
    return detail, ringkasan


# ============================================================
# UTIL
# ============================================================

def proses_file(path_json: str):
    """Membaca file JSON, mendeteksi strukturnya, lalu memprosesnya."""
    with open(path_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    tipe, daftar = deteksi_struktur(data)
    if tipe == "rotio":
        return proses_rotio(daftar)
    elif tipe == "kai":
        return proses_kai(daftar)
    elif tipe == "hokben":
        return proses_hokben(daftar)
    elif tipe == "kopken":
        return proses_kopken(daftar)
    elif tipe == "fore":
        return proses_fore(daftar)
    elif tipe == "fave":
        return proses_fave(daftar)
    else:  # "sams"
        return proses_sams(daftar)


def simpan_csv(detail: list, path_csv: str):
    """Menyimpan detail per transaksi ke file CSV."""
    if not detail:
        return
    with open(path_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=detail[0].keys())
        writer.writeheader()
        writer.writerows(detail)


def format_rupiah(nilai: float) -> str:
    return f"Rp {nilai:,.2f}".replace(",", "#").replace(".", ",").replace("#", ".")


def cetak_ringkasan(ringkasan: dict):
    print("=" * 50)
    print("RINGKASAN TRANSAKSI")
    print("=" * 50)
    print(f"Jumlah Total Transaksi : {ringkasan['jumlah_transaksi']:,}".replace(",", "."))

    if ringkasan["tipe"] in ("rotio", "sams"):
        print(f"Total Subtotal         : {format_rupiah(ringkasan['total_subtotal'])}")
        print(f"Total DPP              : {format_rupiah(ringkasan['total_dpp'])}")
        print(f"Total Tax (PPN)        : {format_rupiah(ringkasan['total_tax'])}")
        print(f"Total Keseluruhan      : {format_rupiah(ringkasan['total_keseluruhan'])}")
    elif ringkasan["tipe"] == "kai":
        print(f"Total Biayatotal       : {format_rupiah(ringkasan['total_biayatotal'])}")
        print(f"Total DPP              : {format_rupiah(ringkasan['total_dpp'])}")
        print(f"Total Tax              : {format_rupiah(ringkasan['total_tax'])}")
    elif ringkasan["tipe"] in ("hokben", "kopken", "fore", "fave"):
        print(f"Total DPP              : {format_rupiah(ringkasan['total_dpp'])}")
        print(f"Total Tax              : {format_rupiah(ringkasan['total_tax'])}")
        print(f"Total Keseluruhan      : {format_rupiah(ringkasan['total_total'])}")

    print("=" * 50)


# ============================================================
# CEK NO STRUK DUPLIKAT
# ============================================================

def baca_daftar_nostruk(path_file: str) -> list:
    """
    Membaca file berisi daftar no struk. Mendukung dua format:
    1) Teks biasa, satu no struk per baris.
    2) JSON array of strings: ["NOSTRUK1", "NOSTRUK2", ...]
    """
    with open(path_file, "r", encoding="utf-8") as f:
        isi = f.read()

    isi_rapi = isi.strip()
    if isi_rapi.startswith("["):
        try:
            data = json.loads(isi_rapi)
            if isinstance(data, list):
                return [str(x).strip() for x in data if str(x).strip()]
        except json.JSONDecodeError:
            pass  # bukan JSON array yang valid, lanjut baca sebagai teks biasa

    # fallback: teks biasa, satu no struk per baris
    return [baris.strip() for baris in isi.splitlines() if baris.strip()]


def cek_duplikat_nostruk(daftar_nostruk: list) -> list:
    """
    Mengecek no struk yang MUNCUL LEBIH DARI SEKALI di dalam daftar.
    No struk yang unik (muncul 1 kali) tidak disertakan.
    Mengembalikan list of dict, diurutkan dari yang paling sering muncul.
    """
    counter = Counter(daftar_nostruk)
    duplikat = [
        {"no_struk": nostruk, "jumlah_muncul": jumlah}
        for nostruk, jumlah in counter.items()
        if jumlah > 1
    ]
    duplikat.sort(key=lambda x: (-x["jumlah_muncul"], x["no_struk"]))
    return duplikat


def cetak_hasil_duplikat(daftar_nostruk: list, duplikat: list):
    print("=" * 50)
    print("CEK NO STRUK DUPLIKAT")
    print("=" * 50)
    print(f"Total No Struk Diperiksa : {len(daftar_nostruk):,}".replace(",", "."))
    print(f"Jumlah No Struk Duplikat : {len(duplikat):,}".replace(",", "."))
    print("=" * 50)

    if not duplikat:
        print("Tidak ditemukan no struk yang duplikat.")
    else:
        for d in duplikat:
            print(f"{d['no_struk']}  ({d['jumlah_muncul']}x)")

    print("=" * 50)


def jalankan_cek_duplikat(args):
    """Alur untuk mode --cek-duplikat, terpisah dari mode hitung transaksi."""
    daftar_nostruk = baca_daftar_nostruk(args.json_path)
    duplikat = cek_duplikat_nostruk(daftar_nostruk)

    if args.csv_flag:
        if not duplikat:
            print("Tidak ditemukan no struk yang duplikat — file CSV tidak dibuat.")
            return
        csv_path = str(Path(args.json_path).with_suffix(".csv"))
        simpan_csv(duplikat, csv_path)
        print(f"Daftar no struk duplikat disimpan ke: {csv_path}")
    else:
        cetak_hasil_duplikat(daftar_nostruk, duplikat)
        nama_file = Path(args.json_path).name
        print(f'Jalankan "python3 cek.py {nama_file} --cek-duplikat --csv" untuk mengunduh CSV')


# ============================================================
# BANDINGKAN NO STRUK ANTAR DUA FILE (cari yang tidak berpasangan)
# ============================================================

def bandingkan_nostruk(daftar_a: list, daftar_b: list) -> dict:
    """
    Membandingkan dua daftar no struk. Kebalikan dari cek_duplikat_nostruk:
    di sini yang dicari adalah no struk yang TIDAK PUNYA PASANGAN di file
    satunya (hanya muncul di salah satu file, bukan di keduanya).
    """
    set_a = set(daftar_a)
    set_b = set(daftar_b)

    hanya_di_a = sorted(set_a - set_b)
    hanya_di_b = sorted(set_b - set_a)

    return {"hanya_di_a": hanya_di_a, "hanya_di_b": hanya_di_b}


def cetak_hasil_bandingkan(nama_a: str, nama_b: str, daftar_a: list, daftar_b: list, hasil: dict):
    print("=" * 50)
    print("BANDINGKAN NO STRUK ANTAR FILE")
    print("=" * 50)
    print(f"File 1 : {nama_a}  ({len(daftar_a):,} no struk)".replace(",", "."))
    print(f"File 2 : {nama_b}  ({len(daftar_b):,} no struk)".replace(",", "."))
    total_tidak_berpasangan = len(hasil["hanya_di_a"]) + len(hasil["hanya_di_b"])
    print(f"Jumlah No Struk Tidak Berpasangan : {total_tidak_berpasangan:,}".replace(",", "."))
    print("=" * 50)

    if total_tidak_berpasangan == 0:
        print("Semua no struk di kedua file sudah berpasangan.")
    else:
        if hasil["hanya_di_a"]:
            print(f"Hanya ada di {nama_a} ({len(hasil['hanya_di_a'])}):")
            for ns in hasil["hanya_di_a"]:
                print(f"  {ns}")
        if hasil["hanya_di_b"]:
            print(f"Hanya ada di {nama_b} ({len(hasil['hanya_di_b'])}):")
            for ns in hasil["hanya_di_b"]:
                print(f"  {ns}")

    print("=" * 50)


def jalankan_bandingkan(args):
    """Alur untuk mode --bandingkan, membutuhkan dua file input."""
    nama_a = Path(args.json_path).name
    nama_b = Path(args.file2_path).name

    daftar_a = baca_daftar_nostruk(args.json_path)
    daftar_b = baca_daftar_nostruk(args.file2_path)

    hasil = bandingkan_nostruk(daftar_a, daftar_b)

    detail = (
        [{"no_struk": ns, "hanya_ada_di": nama_a} for ns in hasil["hanya_di_a"]] +
        [{"no_struk": ns, "hanya_ada_di": nama_b} for ns in hasil["hanya_di_b"]]
    )

    if args.csv_flag:
        if not detail:
            print("Semua no struk di kedua file sudah berpasangan — file CSV tidak dibuat.")
            return
        nama_csv = f"{Path(args.json_path).stem}_vs_{Path(args.file2_path).stem}.csv"
        csv_path = str(Path(args.json_path).with_name(nama_csv))
        simpan_csv(detail, csv_path)
        print(f"Daftar no struk tidak berpasangan disimpan ke: {csv_path}")
    else:
        cetak_hasil_bandingkan(nama_a, nama_b, daftar_a, daftar_b, hasil)
        print(f'Jalankan "python3 cek.py {nama_a} {nama_b} --bandingkan --csv" untuk mengunduh CSV')


# ============================================================
# DAFTAR FUNGSI (--fungsi)
# ============================================================

def cetak_daftar_fungsi():
    """Menampilkan menu semua fungsi/mode yang tersedia beserta contoh perintah bash-nya."""
    garis = "=" * 64
    print(garis)
    print("DAFTAR FUNGSI cek.py")
    print(garis)

    print()
    print("1) HITUNG TRANSAKSI (struktur file JSON terdeteksi otomatis)")
    print("   Mendukung struktur: rotio, kai, hokben, kopken, fore, fave, sams")
    print("   $ python3 cek.py <file.json>")
    print("   $ python3 cek.py <file.json> --csv")

    print()
    print("2) CEK NO STRUK DUPLIKAT (di dalam satu file)")
    print("   Menampilkan no struk yang muncul lebih dari 1 kali.")
    print("   $ python3 cek.py <file> --cek-duplikat")
    print("   $ python3 cek.py <file> --cek-duplikat --csv")

    print()
    print("3) BANDINGKAN DUA FILE NO STRUK (cari yang tidak berpasangan)")
    print("   Menampilkan no struk yang hanya ada di salah satu file.")
    print("   $ python3 cek.py <file1> <file2> --bandingkan")
    print("   $ python3 cek.py <file1> <file2> --bandingkan --csv")

    print()
    print("4) TAMPILKAN DAFTAR FUNGSI INI")
    print("   $ python3 cek.py --fungsi")

    print(garis)


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="Hitung ringkasan transaksi dari file JSON, cek no struk duplikat, atau bandingkan dua file no struk.")
    parser.add_argument("json_path", nargs="?", default="rotio.json", help="Path ke file JSON transaksi (atau file daftar no struk untuk mode --cek-duplikat / --bandingkan)")
    parser.add_argument("file2_path", nargs="?", default=None, help="File kedua, hanya dipakai untuk mode --bandingkan")
    parser.add_argument("--csv", dest="csv_flag", action="store_true", help="Unduh hasil ke CSV (nama file otomatis mengikuti nama file input)")
    parser.add_argument("--cek-duplikat", dest="cek_duplikat_flag", action="store_true", help="Mode cek no struk duplikat di dalam satu file")
    parser.add_argument("--bandingkan", dest="bandingkan_flag", action="store_true", help="Mode bandingkan dua file no struk, cari yang tidak berpasangan")
    parser.add_argument("--fungsi", dest="fungsi_flag", action="store_true", help="Tampilkan daftar semua fungsi/mode yang tersedia beserta contoh perintahnya")
    args = parser.parse_args()

    if args.fungsi_flag:
        cetak_daftar_fungsi()
        return

    if not Path(args.json_path).exists():
        print(f"File tidak ditemukan: {args.json_path}")
        sys.exit(1)

    if args.bandingkan_flag:
        if not args.file2_path:
            print('Mode --bandingkan butuh dua file. Contoh: python3 cek.py file1.json file2.json --bandingkan')
            sys.exit(1)
        if not Path(args.file2_path).exists():
            print(f"File tidak ditemukan: {args.file2_path}")
            sys.exit(1)
        jalankan_bandingkan(args)
        return

    if args.cek_duplikat_flag:
        jalankan_cek_duplikat(args)
        return

    try:
        detail, ringkasan = proses_file(args.json_path)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    if args.csv_flag:
        csv_path = str(Path(args.json_path).with_suffix(".csv"))
        simpan_csv(detail, csv_path)
        print(f"Detail per transaksi disimpan ke: {csv_path}")
    else:
        cetak_ringkasan(ringkasan)
        nama_json = Path(args.json_path).name
        print(f'Jalankan "python3 cek.py {nama_json} --csv" untuk mengunduh CSV')


if __name__ == "__main__":
    main()
