# Espacio Bosques - Stop All Services Script (PowerShell)

Write-Host "🛑 Stopping all Espacio Bosques services..." -ForegroundColor Yellow

# Stop jobs by ID files
if (Test-Path ".hardhat.job") {
    $jobId = Get-Content ".hardhat.job"
    Stop-Job -Id $jobId -ErrorAction SilentlyContinue
    Remove-Job -Id $jobId -ErrorAction SilentlyContinue
    Remove-Item ".hardhat.job"
    Write-Host "✓ Stopped Hardhat (Job $jobId)" -ForegroundColor Green
}

if (Test-Path ".backend.job") {
    $jobId = Get-Content ".backend.job"
    Stop-Job -Id $jobId -ErrorAction SilentlyContinue
    Remove-Job -Id $jobId -ErrorAction SilentlyContinue
    Remove-Item ".backend.job"
    Write-Host "✓ Stopped Backend (Job $jobId)" -ForegroundColor Green
}

if (Test-Path ".frontend.job") {
    $jobId = Get-Content ".frontend.job"
    Stop-Job -Id $jobId -ErrorAction SilentlyContinue
    Remove-Job -Id $jobId -ErrorAction SilentlyContinue
    Remove-Item ".frontend.job"
    Write-Host "✓ Stopped Frontend (Job $jobId)" -ForegroundColor Green
}

# Kill by port as backup
$ports = @(8545, 3001, 5173)
foreach ($port in $ports) {
    try {
        $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                     Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($proc in $processes) {
            Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
            Write-Host "✓ Killed process on port $port" -ForegroundColor Green
        }
    } catch {
        # Port not in use
    }
}

Write-Host "✅ All services stopped" -ForegroundColor Green
