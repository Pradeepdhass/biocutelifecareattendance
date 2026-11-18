# Bio Cute Life Care — Two-Branch Attendance Management System

Complete full-stack Attendance Management System supporting **exactly TWO branches** (`Coimbatore` and `Chennai`) and **exactly TWO user roles** (`MANAGER` and `EMPLOYEE`), across **Backend API (Node.js + Express + SQLite)**, **Web (React.js)**, and **Mobile (React Native)**.

## Core Rules & Architecture

- **Two Branches Only**: `Coimbatore` and `Chennai` (enforced via SQLite `CHECK` constraints and API validation).
- **Two Roles Only**:
  - **One Central `MANAGER`**: Manages employees across both Coimbatore and Chennai, views combined & branch-filtered attendance, activates/deactivates accounts, and generates Excel (`.xlsx`), PDF (`.pdf`), and CSV (`.csv`) reports. Database-level unique index (`idx_single_manager`) guarantees only ONE Manager account can exist.
  - **`EMPLOYEE`**: Logs in with assigned email & password, views their own profile (strictly Name, Email, read-only Branch), checks in and checks out with backend server timestamps, and views only their own attendance history. Cannot change branch or access manager/other-employee APIs.
- **Minimal Employee Profile**: Strictly **3 fields only** — `Employee Name`, `Email Address`, and `Branch` (`Coimbatore` or `Chennai`). Unique emails enforced across both branches.
- **Core Database Tables (`backend/data/attendance.db`)**:
  1. `users` (`id`, `email`, `password_hash`, `role`, `is_active`)
  2. `employees` (`id`, `user_id`, `employee_name`, `email`, `branch`)
  3. `attendance` (`id`, `employee_id`, `branch`, `attendance_date`, `check_in`, `check_out`, `working_hours`, `status`)

## Quick Start

### 1. Start the Backend API (`http://localhost:4000`)
```powershell
npm run install:backend
npm run backend
```

### 2. Start the Web Application (`http://localhost:5173`)
In a second terminal:
```powershell
npm run dev
```
Open **http://localhost:5173**.

### 3. Initial One-Time Manager Setup
No credentials are hardcoded. On first launch:
- Click **Setup Manager ›** on the login page (or visit `http://localhost:5173/setup`), **OR**
- Run the CLI setup script: `npm run setup:manager`

Once the single central Manager account is created, the setup endpoint permanently locks (`403 Forbidden`).

### 4. Start the Mobile Application (React Native / Expo)
```powershell
npm run install:mobile
npm run mobile
```
Set `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env` (e.g., `http://<your-lan-ip>:4000/api`) when testing on a physical device.

## Reports & Exports (Manager Only)
- All Branches Attendance Report
- Coimbatore Attendance Report
- Chennai Attendance Report
- Employee-wise Attendance Report
- Daily Attendance Report
- Monthly Attendance Report
- Supported formats: **Excel (`.xlsx`)**, **PDF (`.pdf`)**, and **CSV (`.csv`)**
