# BIBRunnerOCR

A photo portal and search engine platform for marathon runners, featuring automatic BIB number detection via OCR, dynamic pricing customization, and integrated Midtrans payments.

## Prerequisites

Make sure you have the following software installed on your machine before setting up:

* Git
* Bun (v1.1 or higher) or Node.js (v18 or higher)
* Docker and Docker Compose (required for production deployment)

---

## Step 1: Clone the Repository

Clone the project repository to your local machine and navigate into the project directory:

```bash
git clone https://github.com/dimassfeb-09/ocrbibnumber-skripsi-2026.git
cd ocrbibnumber-skripsi-2026
```

---

## Step 2: Environment Configuration

Create a `.env` file at the root of the project to configure your database connection, API integration, cloud storage, and payment gateway. Both local development (Next.js) and Docker Compose will automatically read this file.

You can copy the variables from the example environment file:

```bash
cp .env.example .env
```

Populate `.env` with the following variables:

```env
# Database Configuration (Used in local development. In Docker, this is automatically overridden to connect to the db service container)
DATABASE_URL=postgres://runner_user:runner_password@localhost:5432/bibrunner

# Python OCR API URL (Used in local development. In Docker, this is automatically overridden to http://ocr-api:8000)
OCR_API_URL=http://localhost:8000

# Next.js Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Storage Configuration (Public & Private buckets)
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_PUBLIC_BUCKET=photo-watermarks
SUPABASE_PRIVATE_BUCKET=photo-originals

# Midtrans Configuration (Sandbox / Production)
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-your-sandbox-client-key
MIDTRANS_SERVER_KEY=your-midtrans-server-key
NEXT_PUBLIC_MIDTRANS_SNAP_URL=https://app.sandbox.midtrans.com/snap/snap.js

# Gmail SMTP Email Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
```

---

## Step 3: Local Development Setup

Follow these steps to run the application locally outside of Docker for development purposes:

1. Install project dependencies:
   ```bash
   bun install
   ```

2. Run database migrations to construct the schema, default configuration, and admin accounts:
   ```bash
   bun run db:migrate
   ```

3. Seed the database with mock events, photos, BIB relations, and payment transactions:
   ```bash
   bun run db:seed
   ```

4. Start the development server:
   ```bash
   bun run dev
   ```

Open http://localhost:3000 in your browser to view the application.

---

## Step 4: Production Deployment (Docker Compose)

To build and deploy the entire stack (Next.js application, PostgreSQL Database, and Python OCR Service) in a production environment:

1. Navigate to the root folder (`SKRIPSI_18JUNE2026` / parent folder of `ocr-bib-number-nextjs`):
   ```bash
   cd ..
   ```

2. Build and run containers in detached mode:
   ```bash
   docker compose up --build -d
   ```

3. Perform database schema migration inside the web container:
   ```bash
   docker compose exec web bun run db:migrate
   ```

4. Seed the database inside the web container (optional, to verify installation):
   ```bash
   docker compose exec web bun run db:seed
   ```

---

## Default Administrator Credentials

Upon running `bun run db:migrate`, a default administrator account is automatically generated for login:

* **Control Panel URL:** http://localhost:3000/admin (or wherever host is mapped)
* **Default Username:** admin
* **Default Password:** admin123

Make sure to change the password immediately inside the database for production environments.

---

## Service Architecture in Docker

The services run within a single bridge network called `runner-network` defined in `docker-compose.yml`:

* **Next.js Web Server (web)**: Mapped to port 3000 on the host machine.
* **PostgreSQL Database (db)**: Mapped to port 5432 on the host machine.
* **Python OCR Server (ocr-api)**: Internal OCR API service, running on port 8000.

In the Docker context, environment configurations inside `docker-compose.yml` point to the internal container names (e.g. `postgres://runner_user:runner_password@db:5432/bibrunner` and `http://ocr-api:8000`), allowing services to communicate seamlessly without host configuration.

---

## Available Scripts

List of available commands in package.json:

* `bun run dev` - Start development server with hot reload
* `bun run build` - Build Next.js application for production
* `bun run start` - Start built production server
* `bun run lint` - Run ESLint checks
* `bun run db:migrate` - Execute migration script
* `bun run db:seed` - Seed database with mock data
