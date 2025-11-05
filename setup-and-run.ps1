# Espacio Bosques - Automated Setup and Run Script (PowerShell)
# This script sets up and runs the entire project with Supabase

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🌳 Espacio Bosques Setup with Supabase" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

function Print-Success {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Warning {
    param($Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Print-Error {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Check prerequisites
Write-Host "Checking prerequisites..."

try {
    $nodeVersion = node -v
    Print-Success "Node.js $nodeVersion found"
} catch {
    Print-Error "Node.js is not installed. Please install Node.js >= 18"
    exit 1
}

try {
    $yarnVersion = yarn -v
    Print-Success "Yarn $yarnVersion found"
} catch {
    Print-Error "Yarn is not installed. Installing yarn globally..."
    npm install -g yarn
}

Write-Host ""

# Step 1: Install dependencies
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📦 Step 1: Installing dependencies" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
yarn install
Print-Success "Dependencies installed"
Write-Host ""

# Step 2: Start Hardhat in background
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "⛓️  Step 2: Starting Hardhat blockchain" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Print-Warning "Starting Hardhat node in background..."

# Kill any existing process on port 8545
Get-Process -Id (Get-NetTCPConnection -LocalPort 8545 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force

# Start Hardhat in background
$hardhatJob = Start-Job -ScriptBlock { Set-Location $using:PWD; yarn start:eth }
Print-Success "Hardhat job started (Job ID: $($hardhatJob.Id))"

# Wait for Hardhat to be ready
Write-Host "Waiting for Hardhat to start..."
$hardhatReady = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8545" -TimeoutSec 1 -ErrorAction SilentlyContinue
        Print-Success "Hardhat node running at http://localhost:8545"
        $hardhatReady = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $hardhatReady) {
    Print-Error "Hardhat failed to start. Check output with: Receive-Job $($hardhatJob.Id)"
    exit 1
}
Write-Host ""

# Step 3: Deploy contracts
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📝 Step 3: Deploying smart contracts" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
yarn deploy:local
Print-Success "Smart contracts deployed"
Write-Host ""

# Step 4: Setup database
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🗄️  Step 4: Setting up Supabase database" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Set-Location backend

Write-Host "Running Prisma migrations..."
yarn prisma:migrate
Print-Success "Database schema created"

Write-Host "Seeding database with test data..."
yarn seed
Print-Success "Database seeded with test data"

Set-Location ..
Write-Host ""

# Step 5: Start backend in background
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Step 5: Starting backend server" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Kill any existing process on port 3001
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force

Set-Location backend
$backendJob = Start-Job -ScriptBlock { Set-Location $using:PWD; yarn dev }
Set-Location ..
Print-Success "Backend job started (Job ID: $($backendJob.Id))"

# Wait for backend to be ready
Write-Host "Waiting for backend to start..."
$backendReady = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 1 -ErrorAction SilentlyContinue
        Print-Success "Backend running at http://localhost:3001"
        $backendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $backendReady) {
    Print-Error "Backend failed to start. Check output with: Receive-Job $($backendJob.Id)"
    exit 1
}
Write-Host ""

# Step 6: Start frontend in background
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎨 Step 6: Starting frontend application" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Kill any existing process on port 5173
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force

Set-Location frontend
$frontendJob = Start-Job -ScriptBlock { Set-Location $using:PWD; yarn dev }
Set-Location ..
Print-Success "Frontend job started (Job ID: $($frontendJob.Id))"

# Wait for frontend to be ready
Write-Host "Waiting for frontend to start..."
$frontendReady = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 1 -ErrorAction SilentlyContinue
        Print-Success "Frontend running at http://localhost:5173"
        $frontendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $frontendReady) {
    Print-Error "Frontend failed to start. Check output with: Receive-Job $($frontendJob.Id)"
    exit 1
}
Write-Host ""

# Save job IDs
"$($hardhatJob.Id)" | Out-File -FilePath ".hardhat.job"
"$($backendJob.Id)" | Out-File -FilePath ".backend.job"
"$($frontendJob.Id)" | Out-File -FilePath ".frontend.job"

# Summary
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ All services started successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service Status:"
Write-Host "  • Hardhat (Blockchain):  http://localhost:8545  (Job: $($hardhatJob.Id))" -ForegroundColor Cyan
Write-Host "  • Backend (API):         http://localhost:3001  (Job: $($backendJob.Id))" -ForegroundColor Cyan
Write-Host "  • Frontend (UI):         http://localhost:5173  (Job: $($frontendJob.Id))" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Quick Links:"
Write-Host "  • Dashboard:      http://localhost:5173/dashboard"
Write-Host "  • Create Project: http://localhost:5173/create"
Write-Host "  • API Health:     http://localhost:3001/health"
Write-Host ""
Write-Host "📋 Demo Scenario: Drone Vigilance"
Write-Host "  1. Open: http://localhost:5173/dashboard"
Write-Host "  2. Click on 'Bosques Forest Drone Vigilance'"
Write-Host "  3. View telemetry, milestones, and funding"
Write-Host "  4. Click 'View AI Reports' → 'Generate New Report'"
Write-Host ""
Write-Host "📝 View Logs:"
Write-Host "  • Hardhat:  Receive-Job $($hardhatJob.Id) -Keep"
Write-Host "  • Backend:  Receive-Job $($backendJob.Id) -Keep"
Write-Host "  • Frontend: Receive-Job $($frontendJob.Id) -Keep"
Write-Host ""
Write-Host "🛑 To stop all services:"
Write-Host "  .\stop-services.ps1"
Write-Host ""
Write-Host "Press Ctrl+C to exit (services will continue running)"
Write-Host "==========================================" -ForegroundColor Cyan
