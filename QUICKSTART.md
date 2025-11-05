# 🚀 Espacio Bosques - Quick Start Guide

This guide will get you up and running with the complete Espacio Bosques platform in minutes!

## ✅ Configuration Completed

The following has been pre-configured for you:

- ✅ Supabase PostgreSQL database connection
- ✅ Anthropic Claude API key
- ✅ Environment variables in `.env`
- ✅ Docker Compose updated (PostgreSQL removed)

## 🎯 One-Command Setup

### Windows (PowerShell)

Open PowerShell in VSCode terminal and run:

```powershell
.\setup-and-run.ps1
```

### Mac/Linux (Bash)

Open Terminal in VSCode and run:

```bash
./setup-and-run.sh
```

This single script will:
1. ✓ Install all dependencies (contracts, backend, frontend)
2. ✓ Start Hardhat blockchain node
3. ✓ Deploy smart contracts
4. ✓ Run database migrations on Supabase
5. ✓ Seed test data (Drone Vigilance project)
6. ✓ Start backend API server
7. ✓ Start frontend React app

**Everything runs in the background!**

## 🛑 Stopping Services

### Windows (PowerShell)

```powershell
.\stop-services.ps1
```

### Mac/Linux (Bash)

```bash
./stop-services.sh
```

## 📊 Manual Setup (Alternative)

If you prefer to run services in separate terminals:

### Terminal 1: Install Dependencies
```bash
yarn install
```

### Terminal 2: Start Blockchain
```bash
yarn start:eth
# Wait for: Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

### Terminal 3: Deploy Contracts
```bash
yarn deploy:local
# Contracts deployed and addresses written to .env
```

### Terminal 4: Setup & Start Backend
```bash
cd backend
yarn prisma:migrate
yarn seed
yarn dev
# Wait for: Backend running at http://localhost:3001
```

### Terminal 5: Start Frontend
```bash
cd frontend
yarn dev
# Wait for: Local: http://localhost:5173/
```

## 🎬 Demo: Drone Vigilance Scenario

After all services start, follow this demo flow:

### 1. View Dashboard
Open: **http://localhost:5173/dashboard**

You'll see 2 pre-seeded projects:
- 🚁 **Bosques Forest Drone Vigilance** (ACTIVE with telemetry)
- 🌱 **Los Bosques Community Organic Garden** (APPROVED)

### 2. Explore Drone Project
Click on "Bosques Forest Drone Vigilance"

View:
- ✅ **4 Milestones**: 1 completed, 1 in progress, 2 pending
- 💰 **Funding**: 30,000 / 50,000 BOSQUES (60%)
- 📡 **Live Telemetry**: Uptime 98%, Battery 75%
- 👥 **Recent Investments**: From community members

### 3. Generate AI Report
1. Click **"View AI Reports"**
2. Click **"Generate New Report"**
3. AI (Claude) analyzes:
   - 30 simulated drone telemetry events
   - Milestone progress
   - Funding status
   - Detects anomalies (low battery, offline status, etc.)

**Report includes:**
- Overall health summary
- Anomaly alerts with severity levels
- Milestone assessments
- Actionable recommendations

### 4. Simulate More Telemetry
Get the PROJECT_ID from the browser URL and run:

```bash
curl -X POST http://localhost:3001/api/simulate/drone/<PROJECT_ID>
```

This adds 10 new telemetry events.

### 5. Create New Project with AI
1. Go to: **http://localhost:5173/create**
2. Enter a natural language prompt:

```
"Create a solar panel installation project for our community center.
We need to install 50kW of solar panels, connect to grid, train staff,
and monitor energy production. Budget is around 30,000 BOSQUES."
```

3. AI generates:
   - Structured project blueprint
   - Multiple milestones with funding percentages
   - Monitoring hints
   - Duration estimates

### 6. Test Smart Contracts
```bash
cd contracts
npx hardhat test
# Runs comprehensive test suite
```

## 🔍 Verification Checklist

After setup, verify all services:

| Service | URL | Expected Response |
|---------|-----|-------------------|
| Frontend | http://localhost:5173 | Espacio Bosques UI |
| Dashboard | http://localhost:5173/dashboard | Project list |
| Backend Health | http://localhost:3001/health | `{"status":"ok"}` |
| Backend API | http://localhost:3001/api | API documentation |
| Hardhat RPC | http://localhost:8545 | JSON-RPC endpoint |

### Check Database
View your Supabase dashboard to see created tables:
- `users`
- `projects`
- `milestones`
- `investments`
- `telemetry`
- `reports`
- `blockchain_events`

## 🛠️ Troubleshooting

### Issue: "Cannot connect to database"

**Solution**: Verify DATABASE_URL in `.env`:
```bash
DATABASE_URL=postgresql://postgres:YOUR_SUPABASE_PASSWORD@db.foczlctfrerqirwztuhc.supabase.co:5432/postgres?schema=public
```

If SSL errors occur, add `&sslmode=require`:
```bash
DATABASE_URL=postgresql://postgres:YOUR_SUPABASE_PASSWORD@db.foczlctfrerqirwztuhc.supabase.co:5432/postgres?schema=public&sslmode=require
```

### Issue: "Port already in use"

**Solution**: Stop conflicting processes:

**Windows PowerShell:**
```powershell
Get-NetTCPConnection -LocalPort 8545,3001,5173 | % { Stop-Process -Id $_.OwningProcess -Force }
```

**Mac/Linux:**
```bash
lsof -ti:8545,3001,5173 | xargs kill -9
```

### Issue: "Contracts fail to deploy"

**Solution**:
1. Ensure Hardhat is running first
2. Check `.env` has: `RPC_URL=http://localhost:8545`
3. Verify no firewall blocking port 8545

### Issue: "AI reports fail"

**Solution**:
1. Verify `ANTHROPIC_API_KEY` in `.env`
2. Check backend logs for API errors
3. Ensure API key has credits

### Issue: "yarn: command not found"

**Solution**: Install Yarn globally:
```bash
npm install -g yarn
```

### Issue: "node: command not found"

**Solution**: Install Node.js >= 18 from https://nodejs.org/

## 📝 Viewing Logs

### Windows PowerShell
```powershell
# View logs in real-time
Get-Job | Receive-Job -Keep

# View specific service
Receive-Job -Id <JOB_ID> -Keep
```

### Mac/Linux Bash
```bash
# View logs
tail -f hardhat.log
tail -f backend.log
tail -f frontend.log
```

## 🔐 Security Notes

⚠️ **IMPORTANT**: The credentials configured are for **development only**.

- The Supabase password is test data
- The Anthropic API key is test data
- Never commit `.env` to version control
- For production, use proper secrets management

## 🌐 Service URLs Reference

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | React application |
| **Dashboard** | http://localhost:5173/dashboard | View projects |
| **Create Project** | http://localhost:5173/create | AI project creator |
| **Backend API** | http://localhost:3001 | Express server |
| **API Docs** | http://localhost:3001/api | API documentation |
| **Health Check** | http://localhost:3001/health | Service status |
| **Hardhat Node** | http://localhost:8545 | Blockchain RPC |
| **Supabase** | https://supabase.com/dashboard | Database admin |

## 📚 Next Steps

1. ✅ **Explore the Dashboard**: See funded projects
2. ✅ **Generate AI Reports**: Analyze project health
3. ✅ **Create Your Own Project**: Use natural language
4. ✅ **Review Smart Contracts**: Check `contracts/` folder
5. ✅ **Read Architecture Docs**: See `ARCHITECTURE.md`
6. ✅ **Run Tests**: Execute contract and backend tests

## 🆘 Need Help?

- **Documentation**: See `README.md` and `SUPABASE_SETUP.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Security**: See `SECURITY.md`
- **Issues**: Check GitHub issues

---

**🎉 You're all set! Happy building with Espacio Bosques!**
