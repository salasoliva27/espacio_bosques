# 🚀 How to Use on a New Computer

## Quick Start (3 Steps)

### Step 1: Clone the Repository

```bash
git clone https://github.com/salasoliva27/espacio_bosques.git
cd espacio_bosques
```

### Step 2: Open in VSCode with Claude Code

```bash
code .
```

Make sure you have Claude Code extension installed in VSCode.

### Step 3: Use the Automated Setup Prompt

1. **Open the file**: `setup_and_run_prompt.txt`
2. **Copy ALL the content**
3. **Paste into Claude Code** (in VSCode)
4. **Provide credentials when asked**:
   - Supabase DATABASE_URL
   - Anthropic API_KEY
5. **Wait for setup to complete** (~3-5 minutes)
6. **Open**: http://localhost:5173/dashboard

---

## What You'll Need

### Required Software
- ✅ **Git** (to clone the repo)
- ✅ **VSCode** (code editor)
- ✅ **Claude Code extension** (VS Code extension)
- ✅ **Node.js ≥ 18** (will be installed if missing)

### Required Credentials

**You'll need to provide these when Claude asks:**

1. **Supabase Database URL**:
   ```
   postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.supabase.co:5432/postgres?schema=public
   ```

2. **Anthropic API Key**:
   ```
   sk-ant-api03-YOUR_KEY_HERE
   ```

---

## Detailed Process

### 1. Clone & Open
```bash
git clone https://github.com/salasoliva27/espacio_bosques.git
cd espacio_bosques
code .
```

### 2. Read the Setup Prompt
Open `setup_and_run_prompt.txt` in VSCode.

### 3. Paste into Claude Code
- Copy the entire content
- Open Claude Code in VSCode
- Paste and press Enter

### 4. Claude Will:
- ✅ Check if Node.js is installed (guide you if not)
- ✅ Check if Yarn is installed (install if needed)
- ✅ Ask for your Supabase DATABASE_URL
- ✅ Ask for your Anthropic API_KEY
- ✅ Create/update `.env` file
- ✅ Run `.\setup-and-run.ps1`
- ✅ Install all dependencies
- ✅ Start Hardhat blockchain
- ✅ Deploy smart contracts
- ✅ Run database migrations
- ✅ Seed test data
- ✅ Start backend API
- ✅ Start frontend app
- ✅ Provide you with links

### 5. You'll Get:
```
✅ All services started successfully!

📊 Service Status:
  • Hardhat (Blockchain):  http://localhost:8545
  • Backend (API):         http://localhost:3001
  • Frontend (UI):         http://localhost:5173

🎯 Quick Links:
  • Dashboard:      http://localhost:5173/dashboard
  • Create Project: http://localhost:5173/create
```

---

## Timeline

| Step | Duration |
|------|----------|
| Clone repo | 30 sec |
| Install Node.js (if needed) | 5 min |
| Claude setup process | 3-5 min |
| **Total** | **4-11 min** |

---

## Alternative: Manual Setup

If you don't want to use the automated prompt:

### 1. Copy credentials into .env
```bash
cp .env.example .env
# Edit .env and add your DATABASE_URL and ANTHROPIC_API_KEY
```

### 2. Run the setup script
**Windows:**
```powershell
.\setup-and-run.ps1
```

**Mac/Linux:**
```bash
./setup-and-run.sh
```

---

## Troubleshooting

### Node.js not installed?
Claude will detect this and guide you to:
1. Download from https://nodejs.org/
2. Install (takes ~5 min)
3. Restart VSCode
4. Continue setup

### Port already in use?
```powershell
# Windows
Get-NetTCPConnection -LocalPort 8545,3001,5173 | % { Stop-Process -Id $_.OwningProcess -Force }

# Mac/Linux
lsof -ti:8545,3001,5173 | xargs kill -9
```

### Credentials not working?
Double-check:
- DATABASE_URL format is correct
- ANTHROPIC_API_KEY starts with `sk-ant-api03-`
- No extra spaces or quotes

---

## Stopping Services

When you're done, tell Claude:
```
Run the stop-services script
```

Or manually:
**Windows:**
```powershell
.\stop-services.ps1
```

**Mac/Linux:**
```bash
./stop-services.sh
```

---

## What Gets Created

After setup, you'll have:
- ✅ All dependencies installed
- ✅ `.env` file configured
- ✅ Hardhat blockchain running (background)
- ✅ Smart contracts deployed
- ✅ Database schema created on Supabase
- ✅ Test data seeded (Drone Vigilance project)
- ✅ Backend API running (background)
- ✅ Frontend app running (background)

---

## Demo: Test the Drone Vigilance Project

### 1. Open Dashboard
http://localhost:5173/dashboard

### 2. Click "Bosques Forest Drone Vigilance"
You'll see:
- 4 milestones (1 completed, 1 in progress)
- 30,000 / 50,000 BOSQUES raised (60%)
- Live telemetry data (uptime 98%, battery 75%)

### 3. Generate AI Report
- Click "View AI Reports"
- Click "Generate New Report"
- Watch Claude analyze 30 drone telemetry events!

### 4. Create New Project
Go to http://localhost:5173/create

Try this prompt:
```
Create a solar panel installation project for our community center.
We need to install 50kW of solar panels, connect to grid, train staff,
and monitor energy production. Budget is around 30,000 BOSQUES.
```

---

## Files You Should Know About

| File | Purpose |
|------|---------|
| **setup_and_run_prompt.txt** | **Use this with Claude** |
| VSCODE_SETUP.md | Detailed setup guide |
| setup-and-run.ps1 | Automated setup script (Windows) |
| setup-and-run.sh | Automated setup script (Mac/Linux) |
| .env.example | Template for credentials |
| README.md | Full project documentation |

---

## Summary

**Three simple steps:**
1. Clone repo
2. Open in VSCode
3. Paste `setup_and_run_prompt.txt` into Claude Code

**Provide credentials when asked**

**Start building! 🌳**
