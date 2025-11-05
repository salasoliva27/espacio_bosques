# 🎯 ESPACIO BOSQUES - FINAL SETUP INSTRUCTIONS

## ✅ CONFIGURATION COMPLETE!

Everything has been configured for you:
- ✅ Supabase database connection
- ✅ Anthropic Claude API key
- ✅ Docker Compose updated
- ✅ All environment variables set
- ✅ Repository cleaned up

---

## ⚠️ BEFORE YOU START

### Install Node.js (if not installed)

1. **Download Node.js 18 or higher**:
   - Go to: https://nodejs.org/
   - Download "LTS" version (recommended)
   - Run installer
   - Restart VSCode terminal after installation

2. **Verify installation**:
   ```powershell
   node --version
   npm --version
   ```

3. **Install Yarn globally**:
   ```powershell
   npm install -g yarn
   ```

---

## 🚀 RUN THE PROJECT

Once Node.js and Yarn are installed, open PowerShell in VSCode and run:

```powershell
.\setup-and-run.ps1
```

### This script will:
1. ✓ Install all dependencies (takes ~2 minutes)
2. ✓ Start Hardhat blockchain
3. ✓ Deploy smart contracts
4. ✓ Create database schema on Supabase
5. ✓ Seed test data (Drone Vigilance project)
6. ✓ Start backend API
7. ✓ Start frontend app

**Total time: ~3-5 minutes**

---

## 🎬 AFTER SETUP COMPLETES

You'll see this message:
```
✅ All services started successfully!

📊 Service Status:
  • Hardhat (Blockchain):  http://localhost:8545
  • Backend (API):         http://localhost:3001
  • Frontend (UI):         http://localhost:5173
```

### Open your browser:

**Dashboard**: http://localhost:5173/dashboard

You'll see:
- 🚁 Bosques Forest Drone Vigilance (ACTIVE)
- 🌱 Los Bosques Community Organic Garden (APPROVED)

---

## 🎯 TEST THE DEMO

### 1. Click "Bosques Forest Drone Vigilance"

View:
- 4 milestones (1 completed, 1 in progress)
- Funding: 30,000 / 50,000 BOSQUES (60%)
- Live telemetry data

### 2. Generate AI Report

- Click **"View AI Reports"**
- Click **"Generate New Report"**
- Watch Claude analyze:
  - 30 drone telemetry events
  - Milestone progress
  - Funding status
  - Anomaly detection

### 3. Create New Project

Go to: http://localhost:5173/create

Try this prompt:
```
Create a solar panel installation project for our community center.
We need to install 50kW of solar panels, connect to grid, train staff,
and monitor energy production. Budget is around 30,000 BOSQUES.
```

AI will generate structured project with milestones!

---

## 🛑 STOP SERVICES

When you're done:

```powershell
.\stop-services.ps1
```

---

## 📁 FILES CREATED FOR YOU

| File | Purpose |
|------|---------|
| **[RUN_THIS.md](RUN_THIS.md)** | Simplest instructions |
| **[START_HERE.md](START_HERE.md)** | Quick start guide |
| **[QUICKSTART.md](QUICKSTART.md)** | Detailed guide |
| **[COMMANDS.md](COMMANDS.md)** | All available commands |
| **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** | Configuration summary |
| **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** | Supabase details |
| **setup-and-run.ps1** | Automated setup script |
| **stop-services.ps1** | Stop all services |

---

## 🔧 MANUAL SETUP (Alternative)

If you prefer manual control, open 4 terminals:

### Terminal 1: Install & Start Blockchain
```powershell
yarn install
yarn start:eth
```

### Terminal 2: Deploy Contracts
```powershell
# Wait for Terminal 1 to show "Started HTTP and WebSocket JSON-RPC server"
yarn deploy:local
```

### Terminal 3: Setup & Start Backend
```powershell
cd backend
yarn prisma:migrate
yarn seed
yarn dev
```

### Terminal 4: Start Frontend
```powershell
cd frontend
yarn dev
```

---

## 🆘 TROUBLESHOOTING

### Node.js not found?

**Install Node.js first!**
- Download from: https://nodejs.org/
- Restart VSCode terminal
- Run: `node --version`

### Yarn not found?

```powershell
npm install -g yarn
```

### Port already in use?

```powershell
# Kill all processes on ports 8545, 3001, 5173
Get-NetTCPConnection -LocalPort 8545,3001,5173 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

### Database connection fails?

Check `.env` file has:
```
DATABASE_URL=postgresql://postgres:YOUR_SUPABASE_PASSWORD@db.foczlctfrerqirwztuhc.supabase.co:5432/postgres?schema=public
```

### AI reports fail?

Check `.env` file has your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_ACTUAL_API_KEY_HERE
```

---

## 📊 WHAT'S CONFIGURED

### Database (Supabase)
```
Host: db.foczlctfrerqirwztuhc.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: YOUR_SUPABASE_PASSWORD
```

### AI (Anthropic Claude)
```
Model: claude-3-5-sonnet-20241022
API Key: Configured in .env
```

### Blockchain (Hardhat)
```
Network: localhost
RPC URL: http://localhost:8545
Chain ID: 31337
```

---

## 🎓 PROJECT STRUCTURE

```
espacio_bosques/
├── .env                    ✅ Configured
├── setup-and-run.ps1       ⚡ RUN THIS
├── stop-services.ps1       🛑 Stop services
├── contracts/              📝 Smart contracts
│   ├── contracts/          Solidity files
│   ├── scripts/            Deploy scripts
│   └── test/               Contract tests
├── backend/                🚀 Express API
│   ├── src/                TypeScript source
│   ├── prisma/             Database schema
│   └── package.json
└── frontend/               🎨 React app
    ├── src/                Components
    └── package.json
```

---

## 🌟 NEXT STEPS

1. **Install Node.js** (if not installed)
2. **Run**: `.\setup-and-run.ps1`
3. **Wait**: ~3-5 minutes for setup
4. **Open**: http://localhost:5173/dashboard
5. **Explore**: Drone Vigilance demo
6. **Generate**: AI reports
7. **Create**: New projects with AI

---

## 📚 LEARN MORE

- **Architecture**: See `ARCHITECTURE.md`
- **Security**: See `SECURITY.md`
- **Full Docs**: See `README.md`
- **Contributing**: See `CONTRIBUTING.md`

---

## 🎉 YOU'RE ALL SET!

Everything is ready. Just:

1. **Install Node.js** (if needed)
2. **Run**: `.\setup-and-run.ps1`
3. **Enjoy**: Espacio Bosques! 🌳

**Questions?** Check the documentation files above.

**Happy building!**
