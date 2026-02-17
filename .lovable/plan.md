

# 🏥 Healthcare Management System

A production-ready healthcare management platform built with React + Lovable Cloud (PostgreSQL, Auth, Storage, Edge Functions).

---

## Phase 1: Foundation — Auth & Dashboard Shell

### Authentication System
- Email-based signup and login with Lovable Cloud Auth
- Two roles: **Admin** and **Doctor** (stored in a separate `user_roles` table with RLS and a `has_role` security definer function)
- Protected routes — unauthenticated users redirected to login
- Password reset flow
- Clean login/signup pages with medical-themed blue/white design

### Dashboard Shell
- Sidebar navigation (collapsible, mobile-responsive)
- Top header with user info and logout
- Summary cards: Total Doctors, Total Patients, Recently Added Patients (placeholder data initially)
- Role-based menu: Admins see all options, Doctors see limited view

---

## Phase 2: Doctor Management

### Doctor CRUD (Admin only)
- Add doctor form: Name, Specialization, Email, Phone, Experience, Profile Image
- Profile image upload to Cloud Storage, storing only the URL in the database
- Edit doctor details (including image replacement)
- Delete doctor (removes image from storage)
- Doctors list with search/filter and profile photos
- Frontend + backend validation (Zod + edge functions)

---

## Phase 3: Patient Management

### Patient CRUD
- Add/edit/delete patients
- Fields: Name, Age, Gender, Contact, Diagnosis, Assigned Doctor (dropdown), Medical Report Image
- Medical report image upload to Cloud Storage
- Assign patients to doctors from dropdown
- Patient list with filtering and search
- Image cleanup on patient deletion

---

## Phase 4: Dashboard & Polish

### Live Dashboard Stats
- Real counts: Total Doctors, Total Patients
- Recently added patients list with timestamps
- Quick-action buttons (Add Doctor, Add Patient)

### UI Quality
- Loading states, success/error toast notifications
- Fully responsive across mobile, tablet, desktop

---

## Phase 5: Compliance & Hardening

### Audit Log & Activity Tracking
- `audit_logs` table recording all create/update/delete actions with user ID, timestamp, action type, table name, and old/new values
- Activity tracking dashboard for admins showing recent system activity
- Error logging table capturing edge function failures and API errors

### Soft Deletes
- Add `deleted_at` column to doctors and patients tables
- All delete operations set `deleted_at` instead of removing rows
- RLS policies and queries filter out soft-deleted records by default
- Admin-only view to see and restore deleted records

### Strict RLS Policies
- Admins: full read/write on all tables
- Doctors: read-only on their own profile, read/write on their assigned patients only
- Doctor-patient relationship enforcement — doctors can only access patients assigned to them
- All policies use the `has_role` security definer function to prevent recursion
- No public/anon access to any table

### Secure File Access
- Signed URLs with expiration for medical report images (not publicly accessible)
- Storage bucket RLS restricting uploads/downloads to authenticated users with appropriate roles

### Edge Function Validation Layer
- All mutations (create/update/delete) routed through edge functions
- Input sanitization and Zod schema validation server-side
- Rate limiting on auth and mutation endpoints
- Consistent error response format with error codes

### Doctor-Patient Relationship Enforcement
- Foreign key constraint linking patients to doctors
- RLS policies ensuring doctors only query/modify their own patients
- Admin override for full access
- Cascade handling when a doctor is soft-deleted (reassignment workflow)

---

## Design Direction
- **Color palette**: Medical blue (#2563EB) and white with soft gray accents
- **Typography**: Clean, professional sans-serif
- **Components**: Cards, data tables, modals for forms, sidebar navigation
- **Responsive**: Mobile-first with collapsible sidebar

