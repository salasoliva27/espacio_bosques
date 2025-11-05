# Espacio Bosques - Supabase Setup Guide

This project has been configured to use **Supabase** as the PostgreSQL database instead of a local instance.

## ✅ What's Been Configured

1. **Database Connection**: Updated to use Supabase PostgreSQL
   - Host: `db.foczlctfrerqirwztuhc.supabase.co`
   - Database: `postgres`

2. **Anthropic API Key**: Configured in `.env`

3. **Docker Compose**: Removed local PostgreSQL service

## 🚀 Running the Project

### Prerequisites

Make sure you have installed:
- **Node.js >= 18** (Download from https://nodejs.org/)
- **Yarn >= 1.22** (Run: `npm install -g yarn`)
- **Docker Desktop** (Optional, for MinIO storage)

### Step 1: Install Dependencies

```bash
# In the project root directory
yarn install
```

This will install dependencies for all workspaces (contracts, backend, frontend).

### Step 2: Start Services

Open **4 separate terminals** in VSCode and run these commands:

#### Terminal 1: Start Hardhat Blockchain Node

```bash
yarn start:eth
```

Wait for: `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/`

#### Terminal 2: Deploy Smart Contracts

```bash
yarn deploy:local
```

This deploys contracts and writes addresses to `.env`

#### Terminal 3: Setup Database & Start Backend

```bash
cd backend

# Run migrations on Supabase
yarn prisma:migrate

# Seed with test data
yarn seed

# Start backend server
yarn dev
```

Wait for: `Backend running at http://localhost:3001`

#### Terminal 4: Start Frontend

```bash
cd frontend
yarn dev
```

Wait for: `Local: http://localhost:5173/`

## 🎯 Testing the Drone Vigilance Demo

1. **Open Dashboard**: http://localhost:5173/dashboard

2. **View Projects**:
   - Bosques Forest Drone Vigilance (ACTIVE with telemetry)
   - Los Bosques Community Organic Garden (APPROVED)

3. **Explore Drone Project**:
   - Click on "Bosques Forest Drone Vigilance"
   - View 4 milestones, funding progress, live telemetry

4. **Generate AI Report**:
   - Click "View AI Reports" → "Generate New Report"
   - AI analyzes telemetry, milestones, and funding status

5. **Simulate More Telemetry**:
   ```bash
   # Get PROJECT_ID from the dashboard URL
   curl -X POST http://localhost:3001/api/simulate/drone/<PROJECT_ID>
   ```

6. **Create New Project**:
   - Go to http://localhost:5173/create
   - Enter a natural language prompt
   - AI generates structured project with milestones

## 🔍 Verification Checklist

After starting all services:

- [ ] Hardhat node: http://localhost:8545 responds
- [ ] Backend health: http://localhost:3001/health returns `{"status":"ok"}`
- [ ] Frontend: http://localhost:5173 shows Espacio Bosques UI
- [ ] Database: Check Supabase dashboard for tables created
- [ ] Contracts: `.env` file has contract addresses populated

## 🛟 Troubleshooting

### Backend can't connect to Supabase

Check your `.env` file has the correct `DATABASE_URL`:
```bash
DATABASE_URL=postgresql://postgres:YOUR_SUPABASE_PASSWORD@db.foczlctfrerqirwztuhc.supabase.co:5432/postgres?schema=public
```

### Prisma migrations fail

If you get SSL errors, update the DATABASE_URL to include SSL mode:
```bash
DATABASE_URL=postgresql://postgres:YOUR_SUPABASE_PASSWORD@db.foczlctfrerqirwztuhc.supabase.co:5432/postgres?schema=public&sslmode=require
```

### Contracts fail to deploy

- Ensure Hardhat node is running first
- Check `.env` has: `RPC_URL=http://localhost:8545`

### AI reports fail

- Verify `ANTHROPIC_API_KEY` is set correctly in `.env`
- Check backend logs for API errors

### Port already in use

If you get port conflicts:
- Hardhat (8545): Stop other blockchain nodes
- Backend (3001): Stop other backend services
- Frontend (5173): Stop other Vite servers

## 📊 Database Schema

The Prisma migrations will create these tables in Supabase:
- `User`
- `Project`
- `Milestone`
- `Investment`
- `Report`
- `Telemetry`
- `Vote`

You can view them in your Supabase dashboard under "Table Editor".

## 🔐 Security Notes

- The credentials in `.env` are for development only
- Never commit `.env` to version control
- For production, use proper secrets management
- The Hardhat private key is a test account only

## 🌐 Accessing Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React application |
| Backend | http://localhost:3001 | Express API server |
| Hardhat | http://localhost:8545 | Local blockchain RPC |
| Supabase | https://supabase.com/dashboard | Database dashboard |

---

**Next Steps**: Open Terminal in VSCode and start with Step 1!
