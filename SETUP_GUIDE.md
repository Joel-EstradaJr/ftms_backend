# 🚀 FTMS Capstone Project - Complete Setup Guide

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [System Architecture](#system-architecture)
- [Quick Start Guide](#quick-start-guide)
- [Detailed Setup Instructions](#detailed-setup-instructions)
- [Running the Applications](#running-the-applications)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

---

## 🔧 Prerequisites

### Required Software
1. **Node.js** (v20.17.52 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **pnpm** (v10.18.3 or higher) - **REQUIRED** for all projects
   - Install: `npm install -g pnpm@10.18.3`
   - Verify: `pnpm --version`
   - ⚠️ **Important**: This project uses pnpm, not npm or yarn

3. **PostgreSQL** (v14 or higher)
   - Download: https://www.postgresql.org/download/
   - Verify: `psql --version`
   - Default credentials: `postgres:password`

4. **Redis** (v6 or higher) - Optional but recommended
   - Windows: https://github.com/tporadowski/redis/releases
   - Linux/Mac: `brew install redis` or `apt-get install redis`
   - Verify: `redis-cli ping` (should return "PONG")

5. **Git**
   - Download: https://git-scm.com/downloads
   - Verify: `git --version`

---

## 🏗️ System Architecture

The FTMS Capstone Project consists of **4 independent repositories**:

```
c:\capstone\
├── audit\              # Audit Logs Microservice (Standalone)
│   ├── Frontend: Next.js (Port 4003)
│   └── Backend: Express.js (Port 4004)
│
├── budget\             # Budget Request Microservice (Standalone)
│   ├── Frontend: Next.js (Port 4001)
│   └── Backend: Express.js (Embedded)
│
├── ftms_backend\       # Finance Main Backend (Express.js - Port 4000)
│   └── REST API for Finance, Revenue, Expense, Payroll, etc.
│
└── ftms_frontend\      # Finance Main Frontend (Next.js - Port 3000)
    ├── /admin - Admin Interface
    └── /staff - Staff Interface
```

### Port Allocation
| Service | Frontend | Backend | Database |
|---------|----------|---------|----------|
| **FTMS Finance** | 3000 | 4000 | ftmsFinal_db |
| **Budget Request** | 4001 | 4001 (embedded) | budget_db |
| **Audit Logs** | 4003 | 4004 | audit_db |
| **Redis** | - | 6379 | - |
| **PostgreSQL** | - | 5432 | - |

---

## ⚡ Quick Start Guide

### Step 1: Clone All Repositories

**Option A: If you have a parent repository**
```bash
git clone <your-parent-repo-url>
cd capstone
```

**Option B: Clone individually**
```bash
mkdir c:\capstone
cd c:\capstone

# Clone each repository
git clone <audit-repo-url> audit
git clone <budget-repo-url> budget
git clone <ftms-backend-repo-url> ftms_backend
git clone <ftms-frontend-repo-url> ftms_frontend
```

### Step 2: Create PostgreSQL Databases

```bash
# Connect to PostgreSQL
psql -U postgres

# Create databases
CREATE DATABASE "ftmsFinal_db";
CREATE DATABASE "budget_db";
CREATE DATABASE "audit_db";

# Create shadow databases (for Prisma migrations)
CREATE DATABASE "audit_shadow_db";

# Exit
\q
```

### Step 3: Start Redis (Optional but Recommended)

```bash
# Windows
redis-server

# Linux/Mac
redis-server /usr/local/etc/redis.conf
```

### Step 4: Quick Setup Script

Run this in **PowerShell** from `c:\capstone`:

```powershell
# Setup all projects
$projects = @("audit", "budget", "ftms_backend", "ftms_frontend")

foreach ($project in $projects) {
    Write-Host "Setting up $project..." -ForegroundColor Green
    cd $project
    
    # Copy environment file
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
    }
    
    # Install dependencies
    pnpm install
    
    # Generate Prisma client if applicable
    if (Test-Path "prisma") {
        pnpm prisma:generate
    }
    
    cd ..
}

Write-Host "Setup complete!" -ForegroundColor Cyan
```

---

## 📝 Detailed Setup Instructions

### 1️⃣ Audit Logs Microservice (`c:\capstone\audit`)

#### Setup Steps
```bash
cd c:\capstone\audit

# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
```

#### Edit `.env` file
```bash
# Update these values:
AUDIT_LOGS_DATABASE_URL=postgresql://postgres:password@localhost:5432/audit_db?schema=public
SHADOW_DATABASE_URL=postgresql://postgres:password@localhost:5432/audit_shadow_db?schema=public

# Set a secure JWT secret (must match across all services)
JWT_SECRET=your-very-long-jwt-secret-key-minimum-32-characters-for-security

# Redis (optional - for caching)
REDIS_URL=redis://localhost:6379
ENABLE_CACHE=true

# Ports
PORT=4003
BACKEND_PORT=4004
```

#### Database Setup
```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Seed API keys for testing
pnpm seed:apikeys
```

#### Run the Application
```bash
# Terminal 1: Backend (Express API)
pnpm backend:dev

# Terminal 2: Frontend (Next.js)
pnpm dev
```

**Access URLs:**
- Frontend: http://localhost:4003
- Backend API: http://localhost:4004

---

### 2️⃣ Budget Request Microservice (`c:\capstone\budget`)

#### Setup Steps
```bash
cd c:\capstone\budget

# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
```

#### Edit `.env` file
```bash
# Update these values:
BUDGET_REQUEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/budget_db?schema=public

# Set the same JWT secret as Audit
JWT_SECRET=your-very-long-jwt-secret-key-minimum-32-characters-for-security

# Redis
REDIS_URL=redis://localhost:6379
ENABLE_CACHE=true

# Integration endpoints
FINANCE_API_URL=http://localhost:4000
AUDIT_LOGS_API_URL=http://localhost:4004

# Port
PORT=4001
```

#### Database Setup
```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Seed global data
pnpm prisma:seed
```

#### Run the Application
```bash
# Option A: Frontend only (recommended for development)
pnpm dev

# Option B: Backend API only
pnpm dev:api

# Option C: Both together (use separate terminals)
# Terminal 1:
pnpm dev:api

# Terminal 2:
pnpm dev
```

**Access URL:**
- Frontend & API: http://localhost:4001

---

### 3️⃣ FTMS Backend (`c:\capstone\ftms_backend`)

#### Setup Steps
```bash
cd c:\capstone\ftms_backend

# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
```

#### Edit `.env` file
```bash
# Update these values:
DATABASE_URL=postgresql://postgres:password@localhost:5432/ftmsFinal_db?schema=public

# Set the same JWT secret
JWT_SECRET=your-very-long-jwt-secret-key-minimum-32-characters-for-security

# Redis
REDIS_URL=redis://localhost:6379
ENABLE_CACHE=true

# Microservices
BUDGET_API_URL=http://localhost:4001
AUDIT_API_URL=http://localhost:4004

# CORS - Allow frontend
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4001,http://localhost:4003,http://localhost:4004

# External APIs (HR, Operations)
HR_API_EMPLOYEES_URL=https://backends-blue.vercel.app/api/clean/hr_employees
OP_API_BUSTRIP_URL=https://backends-blue.vercel.app/api/clean/op_bus-trip-details

# Port
PORT=4000
```

#### Database Setup
```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Seed database
pnpm prisma:seed
```

#### Run the Application
```bash
pnpm dev
```

**Access URL:**
- Backend API: http://localhost:4000

---

### 4️⃣ FTMS Frontend (`c:\capstone\ftms_frontend`)

#### Setup Steps
```bash
cd c:\capstone\ftms_frontend

# 1. Install dependencies
pnpm install

# 2. Create .env.local (no .env.example exists)
# Create a new file: .env.local
```

#### Create `.env.local` file
```bash
# Create this file manually
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_BUDGET_API_URL=http://localhost:4001
NEXT_PUBLIC_AUDIT_API_URL=http://localhost:4004
```

#### Run the Application
```bash
# Standard dev mode
pnpm dev

# Or with turbo (faster)
pnpm dev:admin  # Admin interface
# OR
pnpm dev:staff  # Staff interface
```

**Access URLs:**
- Main: http://localhost:3000
- Admin: http://localhost:3000/admin
- Staff: http://localhost:3000/staff

---

## 🚀 Running the Applications

### Development Workflow

**Start all services in this order:**

1. **Start Redis** (optional but recommended)
   ```bash
   redis-server
   ```

2. **Start Audit Backend** (Terminal 1)
   ```bash
   cd c:\capstone\audit
   pnpm backend:dev
   ```

3. **Start Audit Frontend** (Terminal 2)
   ```bash
   cd c:\capstone\audit
   pnpm dev
   ```

4. **Start Budget Service** (Terminal 3)
   ```bash
   cd c:\capstone\budget
   pnpm dev
   ```

5. **Start FTMS Backend** (Terminal 4)
   ```bash
   cd c:\capstone\ftms_backend
   pnpm dev
   ```

6. **Start FTMS Frontend** (Terminal 5)
   ```bash
   cd c:\capstone\ftms_frontend
   pnpm dev
   ```

### Testing the Setup

**Check each service:**
```bash
# FTMS Backend
curl http://localhost:4000/api/health

# Budget Service
curl http://localhost:4001/api/health

# Audit Backend
curl http://localhost:4004/api/health
```

**Check frontends:**
- FTMS: http://localhost:3000
- Budget: http://localhost:4001
- Audit: http://localhost:4003

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Windows - Find process using port
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <process-id> /F
```

#### 2. Prisma Client Not Generated
```bash
# Regenerate for all projects
cd audit && pnpm prisma:generate
cd ../budget && pnpm prisma:generate
cd ../ftms_backend && pnpm prisma:generate
```

#### 3. Database Connection Error
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Verify database exists
psql -U postgres -l

# Recreate if needed
psql -U postgres
CREATE DATABASE "ftmsFinal_db";
```

#### 4. Redis Connection Error
```bash
# Test Redis connection
redis-cli ping

# If Redis is not needed, set in .env:
ENABLE_CACHE=false
```

#### 5. pnpm Not Found
```bash
# Install pnpm globally
npm install -g pnpm@10.18.3

# Verify installation
pnpm --version
```

#### 6. Module Not Found Errors
```bash
# Clear cache and reinstall
cd <project-folder>
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

#### 7. JWT Secret Mismatch
**Make sure ALL `.env` files use the SAME `JWT_SECRET`:**
```bash
JWT_SECRET=your-very-long-jwt-secret-key-minimum-32-characters-for-security
```

#### 8. CORS Errors
**Update CORS settings in backend `.env` files:**
```bash
# ftms_backend/.env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4001,http://localhost:4003,http://localhost:4004

# budget/.env
CORS_ORIGIN=http://localhost:4001,http://localhost:3000,http://localhost:4000

# audit/.env
CORS_ORIGIN=http://localhost:4003,http://localhost:4000,http://localhost:4001
```

---

## 📚 Additional Resources

### Prisma Commands Reference

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run migrations (development)
pnpm prisma:migrate

# Create migration
pnpm prisma migrate dev --name <migration-name>

# Open Prisma Studio (database GUI)
pnpm prisma:studio

# Reset database (⚠️ deletes all data)
pnpm prisma migrate reset

# Seed database
pnpm prisma:seed
```

### Development Commands

**Audit Service:**
```bash
pnpm dev              # Frontend (Next.js)
pnpm backend:dev      # Backend (Express)
pnpm backend:build    # Build backend
pnpm backend:start    # Run production backend
```

**Budget Service:**
```bash
pnpm dev              # Frontend (Next.js)
pnpm dev:api          # Backend API only
pnpm build            # Build frontend
pnpm build:api        # Build backend
```

**FTMS Backend:**
```bash
pnpm dev              # Development mode
pnpm build            # Build for production
pnpm start            # Run production server
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix linting issues
```

**FTMS Frontend:**
```bash
pnpm dev              # Development mode
pnpm dev:admin        # Admin interface
pnpm dev:staff        # Staff interface
pnpm build            # Build for production
pnpm start            # Run production server
```

---

## 🎯 Next Steps

After completing the setup:

1. **Test Authentication**
   - Navigate to http://localhost:3000
   - Try admin and staff logins

2. **Check Microservices Integration**
   - Create a Budget Request from http://localhost:4001
   - Verify it appears in FTMS at http://localhost:3000/admin/budget-management

3. **Verify Audit Logs**
   - Perform any action in FTMS
   - Check audit logs at http://localhost:4003

4. **Review Documentation**
   - `audit/docs/` - Audit microservice docs
   - `budget/TASKS/` - Budget implementation guides
   - `ftms_backend/docs/` - Backend integration docs
   - `ftms_backend/OVERALL.TASK.md` - Complete task breakdown

---

## 📞 Support

### Common Questions

**Q: Do I need to run all 4 services?**
A: Yes, for full functionality. However, you can start with:
- `ftms_backend` + `ftms_frontend` for basic Finance features
- Add `budget` for Budget Request features
- Add `audit` for Audit Trail features

**Q: Can I use npm instead of pnpm?**
A: No, all projects are configured for pnpm. Using npm may cause dependency issues.

**Q: Do I need Redis?**
A: It's optional but recommended for caching. Set `ENABLE_CACHE=false` in `.env` files to disable.

**Q: Why are there so many terminals?**
A: Each service runs independently:
- 1 terminal for each backend (3 total)
- 1 terminal for each frontend (3 total)
- 1 terminal for Redis (optional)
- Total: 6-7 terminals for full system

**Q: How do I stop all services?**
A: Press `Ctrl+C` in each terminal, or close all terminal windows.

---

## ✅ Setup Checklist

Use this checklist to verify your setup:

- [ ] Node.js v20+ installed
- [ ] pnpm v10.18.3+ installed
- [ ] PostgreSQL installed and running
- [ ] Redis installed and running (optional)
- [ ] All 4 repositories cloned to `c:\capstone\`
- [ ] All `.env` files created with correct values
- [ ] Same JWT_SECRET in all `.env` files
- [ ] All databases created (ftmsFinal_db, budget_db, audit_db)
- [ ] Dependencies installed in all projects (`pnpm install`)
- [ ] Prisma clients generated in all projects
- [ ] All migrations run successfully
- [ ] All services start without errors
- [ ] All frontends accessible in browser
- [ ] Backend health checks return success

---

## 📄 License

This project is for educational purposes as part of a capstone project.

---

**Last Updated:** October 24, 2025  
**Version:** 1.0.0
