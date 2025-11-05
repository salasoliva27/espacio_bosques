#!/bin/bash

# Espacio Bosques - Stop All Services Script

echo "🛑 Stopping all Espacio Bosques services..."

# Kill processes by PID files
if [ -f .hardhat.pid ]; then
    kill $(cat .hardhat.pid) 2>/dev/null && echo "✓ Stopped Hardhat ($(cat .hardhat.pid))"
    rm .hardhat.pid
fi

if [ -f .backend.pid ]; then
    kill $(cat .backend.pid) 2>/dev/null && echo "✓ Stopped Backend ($(cat .backend.pid))"
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    kill $(cat .frontend.pid) 2>/dev/null && echo "✓ Stopped Frontend ($(cat .frontend.pid))"
    rm .frontend.pid
fi

# Kill by port as backup
lsof -ti:8545 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 8545"
lsof -ti:3001 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 3001"
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 5173"

echo "✅ All services stopped"
