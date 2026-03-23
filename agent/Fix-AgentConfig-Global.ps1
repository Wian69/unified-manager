<#
.SYNOPSIS
    Global fix for Unified Enterprise Agent (UEA) configuration.
    Redirects agents to the correct production dashboard URL.
#>

$CorrectUrl = "https://unified-manager.vercel.app"
$InstallDir = "$env:ProgramData\UnifiedAgent"
$ConfigPath = "$InstallDir\config.json"
$AgentScript = "$InstallDir\unified-agent.ps1"

Write-Host "Starting Global Agent Configuration Fix..."

# 1. Ensure Directory Exists
if (-not (Test-Path $InstallDir)) {
    Write-Host "Agent not installed on this machine. Skipping."
    exit 0
}

# 2. Stop existing agent processes
Get-Process | Where-Object { $_.Path -like "*UnifiedAgent*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# 3. Update Configuration
$Config = @{
    Version = "1.3.3"
    ServerUrl = $CorrectUrl
}
$Config | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding utf8 -Force
Write-Host "Configuration updated to point to: $CorrectUrl"

# 4. Update script if a newer version is available locally (optional, but good for local dev)
$LocalFixed = "C:\Users\WianDuRandt\.gemini\antigravity\scratch\unified-manager\agent\unified-agent.ps1"
if (Test-Path $LocalFixed) {
    Copy-Item -Path $LocalFixed -Destination $AgentScript -Force
    Write-Host "Updated agent script to 1.3.3 from local scratch."
}

# 5. Re-launch the agent in the background
if (Test-Path $AgentScript) {
    powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File $AgentScript
    Write-Host "Agent launched successfully."
}

Write-Host "Fix Completed."
