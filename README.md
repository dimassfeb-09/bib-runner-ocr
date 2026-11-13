# BIB Runner OCR

Selected project from `ocr-bib-number-skripsi/bib-runner-ocr`: **Frontend (Next.js)** + **Backend (FastAPI OCR inference: YOLO + PaddleOCR)**.

## Run with Docker

1. Copy env file and fill values:

```bash
cp .env.example .env
```

2. Start services:

```bash
docker compose up -d --build
```

3. Run database migration (first time only):

```bash
docker exec -it bibrunner-web bun run db:migrate
```

Optional seed:

```bash
docker exec -it bibrunner-web bun run db:seed
```

## Services

- Web (Next.js): http://localhost:3000
- OCR API (FastAPI): http://localhost:8000/health
- Database: external PostgreSQL (set `DATABASE_URL` in `.env`)

## Notes

- PostgreSQL 15+ supported (including 18) via `DATABASE_URL`.
- Photos are stored in Supabase Storage (`photo-watermarks`, `photo-originals` buckets).
- Default admin (after seed/migration): `admin` / `admin123`.