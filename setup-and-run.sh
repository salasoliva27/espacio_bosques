#!/bin/bash

# Espacio Bosques - Automated Setup and Run Script
# This script sets up and runs the entire project with Supabase

set -e  # Exit on error

echo "=========================================="
echo "🌳 Espacio Bosques Setup with Supabase"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js >= 18"
    exit 1
fi

if ! command -v yarn &> /dev/null; then
    print_error "Yarn is not installed. Installing yarn globally..."
    npm install -g yarn
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be >= 18. Current: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) found"
print_success "Yarn $(yarn -v) found"
echo ""

# Check for .env
if [ ! -f .env ]; then
  print_warning "No .env found. Copying from .env.example..."
  cp .env.example .env
  print_warning "Please fill in credentials in .env before running in production"
fi

# Step 1: Install dependencies
echo "=========================================="
echo "📦 Step 1: Installing dependencies"
echo "=========================================="
yarn install
print_success "Dependencies installed"
echo ""

# Simulation mode check
if grep -q "SIMULATION_MODE=true" .env 2>/dev/null; then
  echo "🟡 MODO SIMULACIÓN activo"

  # Auto-generate backend wallet if not already set
  if ! grep -q "BACKEND_WALLET_PRIVATE_KEY=0x" .env 2>/dev/null; then
    echo "Generando wallet backend..."
    cd backend && node -e "
const {ethers} = require('ethers');
const w = ethers.Wallet.createRandom();
const fs = require('fs');
let env = fs.readFileSync('../.env', 'utf8');
env = env.replace('BACKEND_WALLET_PRIVATE_KEY=', 'BACKEND_WALLET_PRIVATE_KEY=' + w.privateKey);
env = env.replace('BACKEND_WALLET_ADDRESS=', 'BACKEND_WALLET_ADDRESS=' + w.address);
fs.writeFileSync('../.env', env);
console.log('✅ Wallet: ' + w.address);
" && cd ..
  fi
  echo ""
fi

# Step 2: Start Hardhat in background
echo "=========================================="
echo "⛓️  Step 2: Starting Hardhat blockchain"
echo "=========================================="
print_warning "Starting Hardhat node in background..."

# Kill any existing process on port 8545
lsof -ti:8545 | xargs kill -9 2>/dev/null || true

# Start Hardhat in background
nohup yarn start:eth > hardhat.log 2>&1 &
HARDHAT_PID=$!
echo $HARDHAT_PID > .hardhat.pid

# Wait for Hardhat to be ready
echo "Waiting for Hardhat to start..."
for i in {1..30}; do
    if curl -s http://localhost:8545 > /dev/null 2>&1; then
        print_success "Hardhat node running at http://localhost:8545 (PID: $HARDHAT_PID)"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Hardhat failed to start. Check hardhat.log for details"
        exit 1
    fi
    sleep 1
done
echo ""

# Step 3: Deploy contracts
echo "=========================================="
echo "📝 Step 3: Deploying smart contracts"
echo "=========================================="
yarn deploy:local
print_success "Smart contracts deployed"
echo ""

# Step 4: Setup database
echo "=========================================="
echo "🗄️  Step 4: Setting up Supabase database"
echo "=========================================="
cd backend

echo "Running Prisma migrations..."
yarn prisma:migrate
print_success "Database schema created"

echo "Seeding database with test data..."
yarn seed
print_success "Database seeded with test data"

cd ..
echo ""

# Step 5: Start backend in background
echo "=========================================="
echo "🚀 Step 5: Starting backend server"
echo "=========================================="

# Kill any existing process on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

cd backend
nohup yarn dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../.backend.pid
cd ..

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Backend running at http://localhost:3001 (PID: $BACKEND_PID)"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Backend failed to start. Check backend.log for details"
        exit 1
    fi
    sleep 1
done
echo ""

# Step 6: Start frontend in background
echo "=========================================="
echo "🎨 Step 6: Starting frontend application"
echo "=========================================="

# Kill any existing process on port 5173
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

cd frontend
nohup yarn dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../.frontend.pid
cd ..

# Wait for frontend to be ready
echo "Waiting for frontend to start..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_success "Frontend running at http://localhost:5173 (PID: $FRONTEND_PID)"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Frontend failed to start. Check frontend.log for details"
        exit 1
    fi
    sleep 1
done
echo ""

# Summary
echo "=========================================="
echo "✅ All services started successfully!"
echo "=========================================="
echo ""
echo "📊 Service Status:"
echo "  • Hardhat (Blockchain):  http://localhost:8545  (PID: $HARDHAT_PID)"
echo "  • Backend (API):         http://localhost:3001  (PID: $BACKEND_PID)"
echo "  • Frontend (UI):         http://localhost:5173  (PID: $FRONTEND_PID)"
echo ""
echo "🎯 Quick Links:"
echo "  • Dashboard:      http://localhost:5173/dashboard"
echo "  • Create Project: http://localhost:5173/create"
echo "  • API Health:     http://localhost:3001/health"
echo "  • Invest Quote:   http://localhost:3001/api/invest/quote?mxn=500"
echo ""
echo "📋 Demo Scenario: Drone Vigilance"
echo "  1. Open: http://localhost:5173/dashboard"
echo "  2. Click on 'Bosques Forest Drone Vigilance'"
echo "  3. View telemetry, milestones, and funding"
echo "  4. Click 'View AI Reports' → 'Generate New Report'"
echo ""
echo "📝 Logs:"
echo "  • Hardhat:  tail -f hardhat.log"
echo "  • Backend:  tail -f backend.log"
echo "  • Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop all services:"
echo "  ./stop-services.sh"
echo ""
echo "=========================================="
