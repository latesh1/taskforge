# TaskForge 🚀

TaskForge is a premium, state-of-the-art **Role-Based Project & Task Management System** built with **React (Vite)**, **Node.js (Express)**, and **SQLite (Knex)**. It features dynamic dashboards, robust role-based access control (RBAC), audit logs, background notifications, and detailed work logs.

---

## 🎨 Design & Aesthetics

TaskForge is designed with a premium, modern dark mode experience:
- **Glassmorphism Layout**: Translucent UI components with backdrop blur and subtle borders.
- **Harmony Palettes**: Electric Indigo accent with Cyber Cyan highlights.
- **Micro-Animations**: Custom CSS keyframe animations for fading, sliding, pulsing, and hover responses.
- **Modern Typography**: Inter and Outfit fonts imported dynamically.
- **Custom Scrollbars**: Custom glow scrolls styled with HSL colors matching the dark aesthetic.

---

## 🏗️ Architecture Decisions & Tech Stack

### 📂 Directory Structure
```text
taskforge/
├── backend/              # Node.js Express REST API
│   ├── src/
│   │   ├── db/           # Knex.js DB connection & SQLite migration/seeds
│   │   ├── jobs/         # node-cron background task schedulers
│   │   ├── routes/       # Express Router API endpoints
│   │   └── index.js      # Main server entrypoint
│   └── package.json
├── frontend/             # React SPA built with Vite
│   ├── src/
│   │   ├── components/   # Dashboard, Project, Task, Logs & Reports components
│   │   ├── App.jsx       # Client routing & authentication state manager
│   │   └── index.css     # Premium Vanilla CSS Design System
│   └── package.json
├── schema.sql            # Normalized MySQL DDL Schema
├── README.md             # Project documentation (this file)
└── package.json          # Root scripts to run concurrently
```

### 🧠 Backend Design Decisions
- **RESTful API with Express**: Lightweight, fast, and modular structure.
- **Database Layer (Knex.js + SQLite)**: Knex is used as a SQL query builder, configured to automatically initialize and seed database tables on SQLite by default. This makes the local installation and testing experience completely zero-configuration. It also contains configuration to swap to MySQL/MariaDB instantly by changing the `.env` settings.
- **Role-Based Access Control (RBAC)**: Defined roles include `ADMIN`, `PROJECT_MANAGER`, and `EMPLOYEE`. Security middleware verifies the JSON Web Tokens (JWT) and validates authorization rules before executing protected operations.
- **Chronological Auditing**: Every data modification (Project, Task, User, Work Log) is tracked dynamically in the `audit_logs` table, storing the action type, user, affected entity, and the previous vs new value comparison as JSON.
- **Background Cron Scheduler**: Powered by `node-cron` to check task deadlines and automatically create deadline alerts or overdue notifications daily.
- **Security**: Password hashing using `bcryptjs` and user authentication via JSON Web Tokens (`jsonwebtoken`).

### 💻 Frontend Design Decisions
- **React (Vite)**: High performance Hot Module Replacement (HMR) and optimized build bundles.
- **Vanilla CSS (Premium Design System)**: Maximum flexibility and styling control without heavy frameworks. All components share unified CSS custom properties (tokens) for background shades, gradients, colors, radii, shadows, and timings.
- **Lucide Icons**: Crisp, responsive icons matching the glassmorphic aesthetic.

---

## ⚙️ Project Setup & Installation

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 18+ is recommended).

### 1. Install Dependencies
You can install dependencies for the root, backend, and frontend with a single command from the project root directory:
```bash
npm run install-all
```

### 2. Configure Environment Variables
Copy or rename `.env` inside the `backend` folder:
- Path: `backend/.env`
```ini
PORT=5000
JWT_SECRET=supersecretkeyrolebasedtaskmgmt2026
DB_CLIENT=sqlite3
DB_FILE=./src/db/dev.sqlite3
UPLOAD_DIR=./uploads
```

### 3. Start the Application
Run both backend and frontend concurrently in development mode:
```bash
npm run dev
```
- **Frontend** will start on [http://localhost:5173/](http://localhost:5173/)
- **Backend API** will start on [http://localhost:5000/](http://localhost:5000/)

---

## 🔑 Seeding & Default Credentials

The database initializes with sample projects, tasks, and users automatically when you first start the server. You can log in using any of the following credentials:

| Role | Email | Password | Description |
|---|---|---|---|
| **System Admin** | `admin@company.com` | `admin123` | Oversees audit logs, reports, and manages all users |
| **Project Manager** | `pm1@company.com` | `pm123` | Sarah Connor - Manages projects, assigns tasks, reviews work logs |
| **Project Manager** | `pm2@company.com` | `pm123` | John Doe - Manages projects, assigns tasks, reviews work logs |
| **Employee** | `emp1@company.com` | `emp123` | Alice Cooper - Views assigned tasks, logs hours, uploads attachments |
| **Employee** | `emp2@company.com` | `emp123` | Bob Marley - Views assigned tasks, logs hours, uploads attachments |
| **Employee** | `emp3@company.com` | `emp123` | Charlie Sheen - Views assigned tasks, logs hours, uploads attachments |

---

## 🧐 Key Assumptions & Implementations

1. **SQLite Database Portability**: SQLite was chosen as the default client database for easy setup and review. The query logic uses standard SQL via Knex, allowing the project to easily connect to a MySQL database by altering the `DB_CLIENT` in the `backend/.env` file.
2. **Work Log Review**: Project Managers can view work logs submitted by employees and leave replies/feedback. This facilitates communication directly within task logs.
3. **Attachments**: Local file system storage (`backend/uploads`) is used for task log attachments. In a production environment, this can be swapped with AWS S3 or a similar cloud storage service.
4. **JWT Expiry**: Session durations are handled client-side and verified via JWT middleware on every backend request.
