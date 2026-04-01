$InstallDir = "C:\ProgramData\UnifiedAgent"
$ScriptPath = "$InstallDir\unified-agent.ps1"
$LocalSource = "C:\Users\WianDuRandt\.gemini\antigravity\scratch\unified-manager\agent\unified-agent.ps1"

Write-Host "1. Killing existing UEA processes..."
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*unified-agent.ps1*" } | ForEach-Object { 
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue 
}

Write-Host "2. Removing scheduled task..."
Unregister-ScheduledTask -TaskName "UEA_Persistence" -Confirm:$false -ErrorAction SilentlyContinue

Write-Host "3. Creating Install Directory..."
if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force }

Write-Host "4. Deploying v1.6.2 binary..."
Copy-Item -Path $LocalSource -Destination $ScriptPath -Force

Write-Host "5. Triggering persistent installation..."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -Install

Write-Host "Installation script complete."
