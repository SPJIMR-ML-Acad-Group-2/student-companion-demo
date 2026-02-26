# Classroom Companion — SPJIMR Attendance & Analytics System

Classroom Companion is a comprehensive web-based attendance tracking and analytics platform designed specifically for S.P. Jain Institute of Management & Research (SPJIMR). It leverages biometric swipe logs to automate attendance processing, calculate penalties, and provide detailed insights for both students and the Programme Office.

## 🌟 Key Features

### For the Programme Office (Admin)
- **Biometric Processing**: Upload daily biometric CSV/XLSX logs from campus devices to automatically create class sessions and mark attendance (Present, Absent, Late, or P# Sanctioned Leave).
- **Master Timetable**: Manage course schedules with strictly enforced SPJIMR time slots (S1 through S8).
- **Faculty Management**: Track faculty records, assign them to courses based on their Teaching Areas (e.g., Marketing, Finance), and map them to timetable entries.
- **Academic Hierarchy**: Fully models SPJIMR's structure, including Programmes (PGDM, PGDM-BM), Batches, Terms, Core Divisions, Specialisations, and Spec Divisions.
- **Dynamic Office Calendar**: A weekly grid view that stacks schedules across all divisions for easy monitoring of campus activities.

### For Students
- **Personalized Dashboards**: Students see a filtered view of their attendance, automatically pulling courses from their assigned Core Division and Specialisation.
- **Automated Penalty Logic**: Calculates "Effective Absences" (2 Lates = 1 Absence) and displays the resulting academic penalty level (e.g., "1-Level Downgrade" or "F Grade") based on credit weight.
- **My Schedule (Calendar)**: A personalized weekly calendar showing only the courses applicable to the student, complete with faculty names, timings, and attendance status.

## 🛠️ Technology Stack
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19)
- **Styling**: Vanilla CSS with modern aesthetics (glassmorphism, gradients, CSS modules)
- **Database**: [PostgreSQL](https://www.postgresql.org/) hosted on [Supabase](https://supabase.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **File Parsing**: `xlsx` and `csv-parse` for robust biometric log processing
- **Icons**: `lucide-react`

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- A [Supabase](https://supabase.com) account and project

### 2. Environment Variables
Create a `.env` file in the root of the project:
```env
# Required for Prisma connection pooling (App usage)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Required for Prisma Migrations (Direct connection)
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Authentication variables
SESSION_SECRET="your-super-secret-key-change-in-production"
```
> **Note:** To get the Supabase connection strings, go to your Supabase Dashboard → Project Settings → Database. Ensure `DATABASE_URL` uses the **Session Pooler** (port 6543) and `DIRECT_URL` uses the **Direct Connection** (port 5432).

### 3. Database Setup & Seeding
Install dependencies and sync the schema to your Supabase PostgreSQL database:
```bash
npm install
npx prisma generate
npx prisma db push
```

**(Optional but recommended) Seed the database with demo SPJIMR data:**
```bash
npx prisma db seed
```
*This generates 4 programmes, ~720 students, 24 courses, 20 mapped faculty members, and dummy timetable data.*

### 4. Start the Application
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🌍 Deployment Guide (Vercel)

Deploying the Classroom Companion to Vercel is highly recommended due to Next.js optimizations.

### Step 1: Prepare Supabase
1. Ensure your Supabase database is active and not paused.
2. In Supabase Dashboard → Database → Connection Pooling, verify that **Session Pooler** is enabled. Serverless functions on Vercel require pooling to prevent exhausting database connections.

### Step 2: Deploy to Vercel
1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com/new) and import your repository.

### Step 3: Configure Environment Variables on Vercel
Before clicking "Deploy", add the following Environment Variables in the Vercel dashboard:
- `DATABASE_URL`: Your Supabase **Session Pooler** connection string (port 6543). Append `?pgbouncer=true&connection_limit=1` to the end of the URL.
- `DIRECT_URL`: Your Supabase **Direct Connection** string (port 5432).
- `SESSION_SECRET`: A secure random string for encrypting user sessions.

### Step 4: Build Command
Vercel automatically detects Next.js. However, you must ensure Prisma generates the client during the build. Vercel's default build command (`npm run build`) will automatically run the `postinstall` script if defined, but to be safe, you can set the Install Command in Vercel to:
```bash
npm install && npx prisma generate
```

### Step 5: Deploy
Click **Deploy**. Once the build finishes, your application will be live!

---

## 🔒 Authentication (Demo)
By default, the system uses a simple cookie-based authentication system mapped to the student's Roll Number or the Programme Office's email.

**Programme Office:**
- Email: `office@spjimr.org`

**Student Examples:**
- Roll Number: `PGP-25-001` (PGDM Batch 2025-27, Core Div A)
- Roll Number: `PGPBM-25-001` (PGDM-BM Batch 2025-27, Core Div D)
