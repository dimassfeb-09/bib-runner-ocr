# BIBRunnerOCR - Python Backend API Specification

Repositori ini adalah microservice berbasis Python yang bertugas melakukan deteksi BIB Number (nomor dada) pada foto pelari menggunakan algoritma **YOLO (Object Detection)** dan **OCR (Text Recognition)**.

Microservice ini dipanggil secara langsung oleh aplikasi Next.js frontend saat mengunggah foto baru di panel admin.

---

## 🚀 API Specification

### 1. Detect BIB Number
Melakukan deteksi koordinat BIB Number pada gambar dan mengekstrak teks angka di dalamnya menggunakan kombinasi YOLO dan PaddleOCR.

* **URL:** `/detect-bib`
* **Method:** `POST`
* **Content-Type:** `multipart/form-data`

#### Request Body
Kirim berkas gambar dan opsional nama model YOLO dalam format `form-data`:

| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `image` | `File` (Binary) | **Yes** | Berkas foto pelari yang akan dideteksi nomor dadanya (format gambar seperti JPEG/PNG). |
| `model` | `String` (Form Field) | **No** | Nama model weight YOLO spesifik yang ingin digunakan (opsional). Jika tidak diisi, backend akan menggunakan model bawaan default. |

##### Pilihan Nilai untuk Parameter `model`:
* `split7030_yolo11s`
* `split7030_yolo26s`
* `split8020_yolo11s`
* `split8020_yolo26s`
* `split9010_yolo11s`
* `split9010_yolo26s` *(Default)*

#### Response Format (JSON)
Mengembalikan seluruh objek BIB yang terdeteksi beserta tingkat keyakinan (confidence) dan koordinat bounding box-nya:

```json
{
  "predictions": [
    {
      "bib": "1042",
      "confidence": 0.9854,
      "bbox": [280, 520, 395, 595]
    },
    {
      "bib": "3082",
      "confidence": 0.8120,
      "bbox": [750, 480, 850, 560]
    }
  ]
}
```

* **Penjelasan Field:**
  * `bib`: Teks angka nomor dada yang berhasil dikenali oleh OCR (hanya karakter angka). Jika area terdeteksi tetapi teks gagal dikenali, field ini akan bernilai string kosong `""`.
  * `confidence`: Nilai tingkat keyakinan pengenalan teks oleh OCR (skala `0.0` sampai `1.0`).
  * `bbox`: Koordinat bounding box area nomor dada berformat `[xmin, ymin, xmax, ymax]`.

---

### 2. Health Check
Endpoint diagnosistik ringan untuk memverifikasi status backend.

* **URL:** `/health`
* **Method:** `GET`

#### Response Format (JSON)
```json
{
  "status": "healthy",
  "project": "Foto in Aja API",
  "version": "1.0.0"
}
```

---

## 🛠️ Panduan Pengujian (Collection Request)

### Menggunakan cURL
Anda dapat menguji endpoint ini menggunakan command line cURL berikut:

```bash
curl -X POST http://localhost:8000/detect-bib \
  -H "Content-Type: multipart/form-data" \
  -F "image=@/path/to/your/photo.jpg"
```

### Panduan Setup Postman Collection
Untuk membuat request di Postman:
1. Buat request baru dengan method **POST**.
2. Masukkan URL: `http://localhost:8000/detect-bib`.
3. Masuk ke tab **Body**, pilih opsi **form-data**.
4. Tambahkan key bernama `image`, ubah tipe inputnya di sebelah kanan dari **Text** menjadi **File**.
5. Pilih berkas gambar pelari pada kolom value.
6. Klik **Send** dan amati struktur JSON response yang dikembalikan.

---

## 📦 Lokasi Model Weights (YOLO)
Hasil training model (.pt) diletakkan di dalam folder `weights/` di root backend ini:
* `weights/split7030_yolo11s/best.pt`
* `weights/split7030_yolo26s/best.pt`
* `weights/split8020_yolo11s/best.pt`
* `weights/split8020_yolo26s/best.pt`
* `weights/split9010_yolo11s/best.pt`
* `weights/split9010_yolo26s/best.pt`

Pastikan kode Python Anda memuat file weights ini secara dinamis melalui environment variable (misalnya `YOLO_MODEL_PATH`) agar mudah dikonfigurasi saat deployment.

---

## 🔄 Konversi Model Weights (.pt ke .onnx)

Untuk mengoptimalkan performa inference (kecepatan deteksi) di environment production, Anda dapat mengonversi file model weights PyTorch (`.pt`) ke format **ONNX** (`.onnx`).

### Prasyarat
Pastikan library `ultralytics` sudah terinstall:
```bash
pip install ultralytics
```

### Metode 1: Menggunakan CLI (Command Line Interface)
Jalankan perintah berikut di terminal:
```bash
yolo export model=weights/split7030_yolo11s/best.pt format=onnx
```
*Ganti path `model` sesuai dengan file `.pt` yang ingin Anda konversi.*

### Metode 2: Menggunakan Script Python
Anda juga dapat menggunakan kode Python berikut:
```python
from ultralytics import YOLO

# Load model PyTorch (.pt)
model = YOLO("weights/split7030_yolo11s/best.pt")

# Ekspor model ke format ONNX
model.export(format="onnx")
```

Setelah proses selesai, file baru dengan nama `best.onnx` akan terbentuk di direktori yang sama dengan model aslinya.

