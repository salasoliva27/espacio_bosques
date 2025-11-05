# 🚀 VSCode Automated Setup Guide

## For New Machine / Fresh Clone

This guide helps you set up and run Espacio Bosques on any computer with VSCode and Claude Code.

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ **VSCode** installed
- ✅ **Claude Code extension** installed in VSCode
- ✅ **Git** installed (to clone the repository)

---

## 🎯 One-Command Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/salasoliva27/espacio_bosques.git
cd espacio_bosques
```

### Step 2: Open in VSCode

```bash
code .
```

### Step 3: Use Claude Code to Run Setup

In VSCode with Claude Code:

1. **Open the prompt file**: `setup_and_run_prompt.txt`
2. **Copy the entire content** of the file
3. **Paste it into Claude Code** in VSCode
4. **Press Enter**

Claude will automatically:
- ✅ Check if Node.js and Yarn are installed
- ✅ Guide you to install them if missing
- ✅ Run the complete setup script
- ✅ Start all services (blockchain, backend, frontend)
- ✅ Provide you with links to the running application

---

## 📝 What the Automated Setup Does

### 1. **Dependency Check**
- Verifies Node.js ≥ 18 is installed
- Verifies Yarn is installed
- Installs Yarn globally if needed

### 2. **Environment Configuration**
- Checks/creates `.env` file
- Verifies Supabase database URL
- Verifies Anthropic API key

### 3. **Project Setup**
- Installs all dependencies (contracts, backend, frontend)
- Starts Hardhat blockchain node (background)
- Deploys smart contracts
- Runs Prisma migrations on Supabase
- Seeds database with test data

### 4. **Service Startup**
- Starts backend API server (port 3001)
- Starts frontend React app (port 5173)
- Verifies all services are healthy

### 5. **Completion**
- Provides clickable links to:
  - Dashboard: http://localhost:5173/dashboard
  - Create Project: http://localhost:5173/create
  - Backend API: http://localhost:3001

---

## ⏱️ Expected Timeline

| Step | Duration |
|------|----------|
| Clone repository | ~30 seconds |
| Install Node.js (if needed) | ~5 minutes |
| Install dependencies | ~2 minutes |
| Deploy contracts & seed data | ~1 minute |
| Start services | ~30 seconds |
| **Total** | **~4-9 minutes** |

---

## 🎬 After Setup Completes

### Test the Demo

1. **Open Dashboard**: http://localhost:5173/dashboard
2. **Click**: "Bosques Forest Drone Vigilance"
3. **View**:
   - 4 milestones (1 completed, 1 in progress)
   - Funding: 30,000/50,000 BOSQUES (60%)
   - Live telemetry data
4. **Click**: "View AI Reports" → "Generate New Report"
5. **Watch**: Claude AI analyze 30 telemetry events!

### Create a New Project

1. **Go to**: http://localhost:5173/create
2. **Enter prompt**:
   ```
   Create a solar panel installation project for our community center.
   We need to install 50kW of solar panels, connect to grid, train staff,
   and monitor energy production. Budget is around 30,000 BOSQUES.
   ```
3. **Watch**: AI generate structured project with milestones!

---

## 🛑 Stopping Services

When you're done, tell Claude Code:

```
Run the stop-services.ps1 script to stop all services
```

Or manually run:
```powershell
.\stop-services.ps1
```

---

## 🔧 Manual Setup (Alternative)

If you prefer manual control or the automated setup fails:

### 1. Install Node.js
- Download from: https://nodejs.org/
- Install LTS version (18.x or 20.x)

### 2. Install Yarn
```powershell
npm install -g yarn
```

### 3. Install Dependencies
```bash
yarn install
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env to add your credentials
```

### 5. Run Services (4 Terminals)

**Terminal 1: Blockchain**
```bash
yarn start:eth
```

**Terminal 2: Deploy Contracts**
```bash
yarn deploy:local
```

**Terminal 3: Backend**
```bash
cd backend
yarn prisma:migrate
yarn seed
yarn dev
```

**Terminal 4: Frontend**
```bash
cd frontend
yarn dev
```

---

## 🆘 Troubleshooting

### Node.js Not Found

**Problem**: `node: command not found`

**Solution**:
1. Install Node.js from https://nodejs.org/
2. Restart VSCode
3. Try again

### Port Already in Use

**Problem**: `Port 8545/3001/5173 already in use`

**Solution**:
```powershell
# Windows
Get-NetTCPConnection -LocalPort 8545,3001,5173 | % { Stop-Process -Id $_.OwningProcess -Force }

# Mac/Linux
lsof -ti:8545,3001,5173 | xargs kill -9
```

### Database Connection Failed

**Problem**: Cannot connect to Supabase

**Solution**: Check `.env` has correct `DATABASE_URL`:
```
DATABASE_URL=postgresql://postgres:YOUR_SUPABASE_PASSWORD@db.foczlctfrerqirwztuhc.supabase.co:5432/postgres?schema=public
```

### AI Reports Fail

**Problem**: AI report generation fails

**Solution**: Verify `ANTHROPIC_API_KEY` in `.env` is set correctly

---

## 📚 Additional Resources

| File | Purpose |
|------|---------|
| `setup_and_run_prompt.txt` | **Automated setup prompt for Claude** |
| `INSTALL_NODEJS_FIRST.md` | Node.js installation guide |
| `FINAL_INSTRUCTIONS.md` | Complete setup instructions |
| `QUICKSTART.md` | Detailed step-by-step guide |
| `COMMANDS.md` | All available commands |
| `CLEANUP_SUMMARY.md` | What was removed from repo |

---

## 🔐 Pre-Configured Credentials

The repository comes with **test credentials** already configured:

### Supabase Database
```
Host: db.foczlctfrerqirwztuhc.supabase.co
Database: postgres
User: postgres
Password: YOUR_SUPABASE_PASSWORD
```

### Anthropic API
```
Model: claude-3-5-sonnet-20241022
API Key: (configured in .env)
```

### Blockchain
```
Network: Hardhat localhost
RPC URL: http://localhost:8545
Chain ID: 31337
```

**Note**: These are test credentials for development only.

---

## ✅ Success Checklist

After setup, verify:

- [ ] Hardhat node responds: http://localhost:8545
- [ ] Backend health check: http://localhost:3001/health
- [ ] Frontend loads: http://localhost:5173
- [ ] Dashboard shows projects: http://localhost:5173/dashboard
- [ ] Can view Drone Vigilance project details
- [ ] Can generate AI reports
- [ ] Can create new projects with AI

---

## 🎉 You're Ready!

**Everything should work out of the box!**

Just clone → open in VSCode → paste the prompt → wait for setup → start exploring!

**Questions?** Check the other documentation files in the repository.

---

## 📊 Project Structure

```
espacio_bosques/
├── setup_and_run_prompt.txt   ⚡ USE THIS with Claude Code
├── VSCODE_SETUP.md             📖 This file
├── .env                        🔐 Pre-configured
├── setup-and-run.ps1           🤖 Automated setup script
├── contracts/                  📝 Smart contracts (Solidity)
├── backend/                    🚀 Express API (TypeScript)
└── frontend/                   🎨 React app (TypeScript + React)
```

---

**Happy building with Espacio Bosques! 🌳**
