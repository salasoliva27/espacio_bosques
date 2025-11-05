# 🎯 ESPACIO BOSQUES - RUN THIS!

## ⚡ ONE COMMAND TO START EVERYTHING

Open PowerShell in VSCode Terminal and run:

```powershell
.\setup-and-run.ps1
```

**That's it!** Wait 2-3 minutes and you'll have:
- ✅ Blockchain running
- ✅ Database connected
- ✅ Backend API running
- ✅ Frontend UI running

## 🎬 THEN DO THIS

After you see "✅ All services started successfully!", open your browser:

### 1. View Dashboard
```
http://localhost:5173/dashboard
```

### 2. Click on "Bosques Forest Drone Vigilance"

### 3. Click "View AI Reports" → "Generate New Report"

### 4. Watch AI Magic! 🤖✨
Claude will analyze:
- 30 drone telemetry events
- Project milestones
- Funding status
- Detect anomalies

## 🛑 WHEN YOU'RE DONE

```powershell
.\stop-services.ps1
```

---

## 📚 MORE INFO

- **Quick Start**: [START_HERE.md](START_HERE.md)
- **All Commands**: [COMMANDS.md](COMMANDS.md)
- **Setup Status**: [SETUP_COMPLETE.md](SETUP_COMPLETE.md)
- **Detailed Guide**: [QUICKSTART.md](QUICKSTART.md)

---

## ⚠️ TROUBLESHOOTING

### If setup script fails:

1. **Check Node.js is installed** (need >= 18)
   ```powershell
   node --version
   ```

2. **Check Yarn is installed**
   ```powershell
   yarn --version
   ```
   If not: `npm install -g yarn`

3. **Kill any processes on ports**
   ```powershell
   Get-NetTCPConnection -LocalPort 8545,3001,5173 | % { Stop-Process -Id $_.OwningProcess -Force }
   ```

4. **Try again**
   ```powershell
   .\setup-and-run.ps1
   ```

---

## ✅ WHAT'S CONFIGURED

- ✅ Supabase PostgreSQL database
- ✅ Anthropic Claude API key
- ✅ Hardhat blockchain network
- ✅ All environment variables

Everything is ready! Just run the script!

**🎉 GO FOR IT!**
