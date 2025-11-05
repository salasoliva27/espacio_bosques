# Supabase Setup Guide

This project is now configured to use **Supabase** (cloud PostgreSQL) instead of local Docker PostgreSQL.

## ✅ Benefits

- ✅ No Docker installation required
- ✅ Works on restricted work computers
- ✅ Same database accessible from any machine
- ✅ Free tier: 500 MB database, 2 GB bandwidth/month
- ✅ Built-in dashboard for viewing/editing data
- ✅ Automatic daily backups

---

## 🔐 SECURITY WARNING

**YOU MUST RESET YOUR SUPABASE PASSWORD IMMEDIATELY!**

You accidentally shared your database password publicly. Follow these steps NOW:

1. Go to: https://supabase.com/dashboard/project/foczlctfrerqirwztuhc/settings/database
2. Click **"Reset Database Password"**
3. Generate a new strong password
4. Save it securely (password manager recommended)

---

## 📝 Setup Instructions

### Step 1: Update `.env` File

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your NEW password (after resetting it)
```

In `.env`, update these lines:

```bash
# Replace YOUR_NEW_PASSWORD with your actual Supabase password
DATABASE_URL=postgresql://postgres.foczlctfrerqirwztuhc:YOUR_NEW_PASSWORD@db.foczlctfrerqirwztuhc.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.foczlctfrerqirwztuhc:YOUR_NEW_PASSWORD@db.foczlctfrerqirwztuhc.supabase.co:5432/postgres

# REQUIRED: Add your NEW Anthropic API key (after rotating the exposed one)
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_NEW_ANTHROPIC_KEY_HERE
```

### Step 2: Install Dependencies

```bash
yarn install
```

### Step 3: Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

This will:
- Create all database tables in Supabase
- Generate the Prisma client

### Step 4: Seed Database

```bash
yarn seed
```

This creates:
- 4 test users (admin, validator, planner, investor)
- 2 projects (Drone Vigilance, Community Garden)
- 30 telemetry events for the drone project

---

## 🚀 Running the Project (No Docker)

### Terminal 1: Hardhat Blockchain (local)

```bash
yarn start:eth
```

Wait for: `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/`

### Terminal 2: Deploy Smart Contracts

```bash
yarn deploy:local
```

This deploys all 6 contracts and funds test accounts.

### Terminal 3: Backend API

```bash
cd backend
yarn dev
```

Wait for: `🚀 Espacio Bosques backend listening on port 3001`

### Terminal 4: Frontend

```bash
cd frontend
yarn dev
```

### Terminal 5: Open Browser

```bash
open http://localhost:5173
```

---

## 🎯 Testing the Drone Vigilance Scenario

1. **View Dashboard**: http://localhost:5173/dashboard
2. **Click** "Bosques Forest Drone Vigilance" project
3. **Observe**:
   - 4 milestones (1 completed, 1 in progress, 2 pending)
   - 30,000/50,000 BOSQUES funded (60%)
   - Live telemetry: uptime ~98%, battery ~75%
4. **Click** "View AI Reports"
5. **Click** "Generate New Report"
6. **Wait** ~10 seconds for AI analysis
7. **Review** anomalies, recommendations, milestone progress

### Simulate Additional Telemetry

```bash
# Get project ID from URL (e.g., clxi1234...)
curl -X POST http://localhost:3001/api/simulate/drone/clxi1234...
```

### Create New Project with AI

1. Go to: http://localhost:5173/create
2. Enter prompt:
   ```
   Install 50kW solar panels at our community center with battery storage.
   Include grid connection, inverter setup, and training for 5 staff members.
   Budget around 30,000 BOSQUES over 4 months.
   ```
3. Click "Generate Project Blueprint"
4. Review AI-generated milestones
5. Click "Create Project"

---

## 🔍 View Database in Supabase

1. Go to: https://supabase.com/dashboard/project/foczlctfrerqirwztuhc/editor
2. Click **Table Editor** on the left
3. Browse tables: `users`, `projects`, `milestones`, `telemetry`, `reports`

---

## 🧪 Run Tests

```bash
# Contract tests
yarn test

# E2E tests (Playwright)
cd frontend
yarn e2e
```

---

## 🐛 Troubleshooting

### "Connection refused" Error

**Cause**: Hardhat node not running
**Fix**: Start Hardhat node in Terminal 1: `yarn start:eth`

### "Invalid connection string" Error

**Cause**: Wrong Supabase password in `.env`
**Fix**:
1. Reset password in Supabase dashboard
2. Update `DATABASE_URL` and `DIRECT_URL` in `.env`

### "ANTHROPIC_API_KEY not set" Error

**Cause**: Missing or invalid API key
**Fix**:
1. Go to: https://console.anthropic.com/settings/keys
2. Create new API key
3. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-api03-...`

### "Migration failed" Error

**Cause**: Database connection issue
**Fix**:
1. Check `.env` has correct Supabase credentials
2. Test connection: `npx prisma db pull` (should not error)
3. Re-run: `npx prisma migrate dev`

---

## 📊 Monitoring Database Usage

Check Supabase dashboard: https://supabase.com/dashboard/project/foczlctfrerqirwztuhc

**Free Tier Limits**:
- Database size: 500 MB
- Bandwidth: 2 GB/month
- API requests: Unlimited

**Current usage** (after seed):
- ~10 MB database
- Minimal bandwidth (mostly from frontend)

---

## 🔄 Switching Back to Local PostgreSQL

If you want to use local PostgreSQL instead:

1. Update `.env`:
   ```bash
   DATABASE_URL=postgresql://bosques:bosques_dev_pass@localhost:5432/espacio_bosques?schema=public
   ```

2. Start Docker PostgreSQL:
   ```bash
   docker-compose --profile local-services up postgres -d
   ```

3. Run migrations:
   ```bash
   cd backend
   npx prisma migrate dev
   yarn seed
   ```

---

## 📞 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **GitHub Issues**: https://github.com/salasoliva27/espacio_bosques/issues

---

**Remember**: Always keep your API keys and database passwords secure! Never commit them to Git or share them publicly.
