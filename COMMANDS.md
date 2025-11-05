# 🛠️ Espacio Bosques - Command Reference

Quick reference for all available commands.

## 🚀 Quick Start Commands

### Automated Setup (Recommended)

**Windows (PowerShell):**
```powershell
.\setup-and-run.ps1
```

**Mac/Linux (Bash):**
```bash
./setup-and-run.sh
```

### Stop All Services

**Windows (PowerShell):**
```powershell
.\stop-services.ps1
```

**Mac/Linux (Bash):**
```bash
./stop-services.sh
```

## 📦 Installation Commands

### Install Dependencies (Root)
```bash
yarn install
```

### Install Dependencies (Individual Workspaces)
```bash
yarn workspace @espacio-bosques/contracts install
yarn workspace @espacio-bosques/backend install
yarn workspace @espacio-bosques/frontend install
```

## ⛓️ Blockchain Commands

### Start Hardhat Node
```bash
yarn start:eth
# OR
cd contracts && yarn hardhat:node
```

### Deploy Contracts (Local)
```bash
yarn deploy:local
# OR
cd contracts && yarn deploy:local
```

### Compile Contracts
```bash
cd contracts && yarn compile
```

### Test Contracts
```bash
cd contracts && yarn test
```

### Coverage Report
```bash
cd contracts && yarn coverage
```

### Clean Artifacts
```bash
cd contracts && yarn clean
```

## 🗄️ Database Commands

### Generate Prisma Client
```bash
cd backend && yarn prisma:generate
```

### Run Migrations (Development)
```bash
cd backend && yarn prisma:migrate
```

### Open Prisma Studio
```bash
cd backend && yarn prisma:studio
```

### Seed Database
```bash
cd backend && yarn seed
# OR
yarn seed
```

## 🚀 Backend Commands

### Start Development Server
```bash
cd backend && yarn dev
```

### Build Production
```bash
cd backend && yarn build
```

### Start Production Server
```bash
cd backend && yarn start
```

### Run Tests
```bash
cd backend && yarn test
```

### Run Tests (Watch Mode)
```bash
cd backend && yarn test:watch
```

### Lint Code
```bash
cd backend && yarn lint
```

### Format Code
```bash
cd backend && yarn format
```

## 🎨 Frontend Commands

### Start Development Server
```bash
cd frontend && yarn dev
```

### Build Production
```bash
cd frontend && yarn build
```

### Preview Production Build
```bash
cd frontend && yarn preview
```

### Run Tests
```bash
cd frontend && yarn test
```

### Run E2E Tests
```bash
cd frontend && yarn e2e
# OR
yarn e2e
```

### Lint Code
```bash
cd frontend && yarn lint
```

## 🔍 Testing & Verification Commands

### Test Everything
```bash
yarn test
```

### Check Backend Health
```bash
curl http://localhost:3001/health
```

### Check Hardhat Connection
```bash
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Test Frontend
```bash
curl http://localhost:5173
```

## 📊 Project Management Commands

### Run Both Frontend & Backend
```bash
yarn start:dev
```

### Build Everything
```bash
yarn build
```

### Lint Everything
```bash
yarn lint
```

## 🔧 Utility Commands

### Kill Process on Port (Windows PowerShell)
```powershell
# Kill single port
Get-Process -Id (Get-NetTCPConnection -LocalPort 8545).OwningProcess | Stop-Process -Force

# Kill multiple ports
Get-NetTCPConnection -LocalPort 8545,3001,5173 | % { Stop-Process -Id $_.OwningProcess -Force }
```

### Kill Process on Port (Mac/Linux)
```bash
# Kill single port
lsof -ti:8545 | xargs kill -9

# Kill multiple ports
lsof -ti:8545,3001,5173 | xargs kill -9
```

### Check Port Usage (Windows PowerShell)
```powershell
Get-NetTCPConnection -LocalPort 8545,3001,5173 | Select-Object LocalPort, State, OwningProcess
```

### Check Port Usage (Mac/Linux)
```bash
lsof -i :8545,3001,5173
```

### View Logs (Automated Scripts)

**Windows PowerShell:**
```powershell
# View all jobs
Get-Job

# View specific job output
Receive-Job -Id <JOB_ID> -Keep

# View latest output
Get-Job | Receive-Job -Keep
```

**Mac/Linux:**
```bash
# View logs in real-time
tail -f hardhat.log
tail -f backend.log
tail -f frontend.log

# View last 50 lines
tail -n 50 hardhat.log
```

## 🔄 Git Commands

### Pull Latest Changes
```bash
git pull origin main
```

### Check Status
```bash
git status
```

### View Branches
```bash
git branch -a
```

## 🧪 API Testing Commands

### Get Projects
```bash
curl http://localhost:3001/api/projects
```

### Get Project by ID
```bash
curl http://localhost:3001/api/projects/<PROJECT_ID>
```

### Generate AI Report
```bash
curl -X POST http://localhost:3001/api/ai/reports/<PROJECT_ID> \
  -H "Content-Type: application/json"
```

### Simulate Drone Telemetry
```bash
curl -X POST http://localhost:3001/api/simulate/drone/<PROJECT_ID>
```

### Create Project with AI
```bash
curl -X POST http://localhost:3001/api/ai/create \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a solar panel installation project",
    "plannerId": "<USER_ID>"
  }'
```

## 🐳 Docker Commands (Optional)

### Start All Services
```bash
docker-compose up -d
```

### Stop All Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

### Rebuild Services
```bash
docker-compose up -d --build
```

### Check Running Containers
```bash
docker ps
```

## 📝 Environment Commands

### Copy Environment Template
```bash
cp .env.example .env
```

### Edit Environment (Windows)
```powershell
notepad .env
```

### Edit Environment (Mac/Linux)
```bash
nano .env
# OR
vim .env
```

## 🔐 Contract Verification (Future)

### Verify Contract on Etherscan
```bash
cd contracts && yarn verify --network <NETWORK> <CONTRACT_ADDRESS>
```

## 📚 Documentation Commands

### View Project Structure
```bash
tree -L 2 -I node_modules
```

### Count Lines of Code
```bash
find . -name "*.ts" -o -name "*.tsx" -o -name "*.sol" | xargs wc -l
```

## 🎯 Demo Scenario Commands

### 1. Setup Everything
```powershell
.\setup-and-run.ps1  # Windows
# OR
./setup-and-run.sh   # Mac/Linux
```

### 2. View Dashboard
```bash
# Open in browser
start http://localhost:5173/dashboard  # Windows
open http://localhost:5173/dashboard   # Mac
xdg-open http://localhost:5173/dashboard  # Linux
```

### 3. Simulate Telemetry
```bash
# Get PROJECT_ID from dashboard, then:
curl -X POST http://localhost:3001/api/simulate/drone/<PROJECT_ID>
```

### 4. Generate Report
```bash
curl -X POST http://localhost:3001/api/ai/reports/<PROJECT_ID>
```

### 5. Stop Everything
```powershell
.\stop-services.ps1  # Windows
# OR
./stop-services.sh   # Mac/Linux
```

## 🆘 Troubleshooting Commands

### Reset Database (WARNING: Deletes all data)
```bash
cd backend
npx prisma migrate reset
yarn seed
```

### Clear Hardhat Cache
```bash
cd contracts
yarn clean
rm -rf cache artifacts
```

### Reinstall Dependencies
```bash
rm -rf node_modules yarn.lock
yarn install
```

### Check Node Version
```bash
node --version  # Should be >= 18
```

### Check Yarn Version
```bash
yarn --version  # Should be >= 1.22
```

### Update All Dependencies
```bash
yarn upgrade-interactive --latest
```

---

## 📖 Quick Navigation

- [START_HERE.md](START_HERE.md) - Quick start guide
- [QUICKSTART.md](QUICKSTART.md) - Detailed instructions
- [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - Configuration status
- [README.md](README.md) - Full documentation

---

**🎉 Now you have all the commands at your fingertips!**
