# 🚀 START HERE - Espacio Bosques

## ⚡ Quick Start (Windows)

Open PowerShell in VSCode Terminal and run:

```powershell
.\setup-and-run.ps1
```

That's it! The script will:
- Install all dependencies
- Start all services (blockchain, backend, frontend)
- Set up the database
- Deploy smart contracts
- Seed test data

## 🎯 What Happens Next?

After 2-3 minutes, you'll see:

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

## 🎬 Try the Demo

1. Open: **http://localhost:5173/dashboard**
2. Click on **"Bosques Forest Drone Vigilance"**
3. Click **"View AI Reports"** → **"Generate New Report"**
4. Watch AI analyze the project and generate insights!

## 🛑 Stop Everything

```powershell
.\stop-services.ps1
```

## 📖 Need More Details?

- See [QUICKSTART.md](QUICKSTART.md) for detailed instructions
- See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for Supabase configuration
- See [README.md](README.md) for full documentation

---

## ⚙️ What's Been Configured?

✅ **Database**: Connected to Supabase PostgreSQL
✅ **AI**: Anthropic Claude API configured
✅ **Blockchain**: Hardhat local network
✅ **Environment**: All variables set in `.env`

## 🔧 Manual Setup (Alternative)

If the automated script doesn't work, open 4 terminals:

```bash
# Terminal 1
yarn install
yarn start:eth

# Terminal 2
yarn deploy:local

# Terminal 3
cd backend && yarn prisma:migrate && yarn seed && yarn dev

# Terminal 4
cd frontend && yarn dev
```

---

**🎉 Ready to explore Espacio Bosques!**
