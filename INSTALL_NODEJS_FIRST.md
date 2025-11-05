# ⚠️ INSTALL NODE.JS FIRST!

## 🚨 Node.js is Required

I cannot run the setup automatically because **Node.js is not installed** on your system.

---

## 📥 Step 1: Install Node.js

### Download & Install:

1. **Go to**: https://nodejs.org/
2. **Download**: "LTS" version (Long Term Support) - **Node.js 20.x or 18.x**
3. **Run the installer**: Click through all the steps (use defaults)
4. **Important**: Check the box that says **"Automatically install the necessary tools"**

### Installation takes ~5 minutes

---

## ✅ Step 2: Verify Installation

After installation completes:

1. **Close this VSCode window completely**
2. **Reopen VSCode**
3. **Open new terminal** (Terminal → New Terminal)
4. **Run these commands**:

```powershell
node --version
npm --version
```

You should see:
```
v20.x.x  (or v18.x.x)
10.x.x
```

---

## 📦 Step 3: Install Yarn

In the same PowerShell terminal, run:

```powershell
npm install -g yarn
```

Then verify:
```powershell
yarn --version
```

Should show: `1.22.x` or higher

---

## 🚀 Step 4: Run the Setup

**Now you're ready!** Run:

```powershell
.\setup-and-run.ps1
```

This will:
1. ✓ Install all project dependencies (~2 min)
2. ✓ Start Hardhat blockchain
3. ✓ Deploy smart contracts
4. ✓ Run database migrations on Supabase
5. ✓ Seed test data (Drone Vigilance project)
6. ✓ Start backend API
7. ✓ Start frontend app

**Total time: ~3-5 minutes**

---

## 🎯 Step 5: Open the App

Once the setup completes, you'll see:

```
✅ All services started successfully!

📊 Service Status:
  • Hardhat (Blockchain):  http://localhost:8545
  • Backend (API):         http://localhost:3001
  • Frontend (UI):         http://localhost:5173
```

**Open your browser**: http://localhost:5173/dashboard

---

## 🆘 Troubleshooting

### "node is not recognized"

**Solution**:
1. Close VSCode completely
2. Reopen VSCode
3. Try again

Node.js modifies PATH, which only takes effect in new terminal sessions.

### Still not working?

**Manually add Node.js to PATH**:

1. Search for "Environment Variables" in Windows
2. Edit "Path" under "System variables"
3. Add: `C:\Program Files\nodejs\`
4. Restart VSCode

---

## 🎉 That's All!

**Summary**:
1. Install Node.js from https://nodejs.org/
2. Restart VSCode
3. Install Yarn: `npm install -g yarn`
4. Run: `.\setup-and-run.ps1`
5. Open: http://localhost:5173/dashboard

**You'll be up and running in ~10 minutes total!**
