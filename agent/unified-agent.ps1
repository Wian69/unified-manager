param(
    $ServerUrl = "https://unified-manager.vercel.app"
)

# Unified Enterprise Agent (UEA)
# Version: 1.1.1
# Description: Lightweight persistence and telemetry agent for Unified Manager.

$ErrorActionPreference = "Stop"
$LogFile = "$env:ProgramData\UnifiedAgent\agent.log"

# Ghost-Killer: Ensure no other agent instances are running
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*unified-agent.ps1*" -and $_.ProcessId -ne $PID } | ForEach-Object { 
    Write-Host "Stopping legacy agent (PID: $($_.ProcessId))..."
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue 
}

function Log-Message {
    param($Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Line = "[$Timestamp] $Message"
    Write-Host $Line
    if ($LogFile) {
        if (-not (Test-Path (Split-Path $LogFile))) { New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force }
        $Line | Out-File -FilePath $LogFile -Append
    }
}

try {
    $AgentId = (Get-CimInstance Win32_ComputerSystemProduct).UUID
    $SerialNumber = (Get-CimInstance Win32_Bios).SerialNumber
    $Version = "1.1.1"

    $InstallDir = "$env:ProgramData\UnifiedAgent"
    $ScriptPath = "$InstallDir\unified-agent.ps1"
    $ConfigPath = "$InstallDir\config.json"

    # Self-Installation Logic
    $CurrentPath = ""
    if ($PSCommandPath) { $CurrentPath = $PSCommandPath }
    
    if ($CurrentPath -ne "" -and $CurrentPath -ne $ScriptPath) {
        Log-Message "Installing agent to $ScriptPath..."
        if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force }
        
        # Kill existing agent processes to release file lock
        $ExistingProcs = Get-Process | Where-Object { $_.Path -eq $ScriptPath -and $_.Id -ne $PID }
        if ($ExistingProcs) {
            Log-Message "Stopping existing agent processes..."
            $ExistingProcs | Stop-Process -Force
            Start-Sleep -Seconds 2
        }

        Copy-Item -Path $CurrentPath -Destination $ScriptPath -Force
        
        # Initial Config
        $Config = @{ ServerUrl = $ServerUrl; Version = $Version }
        $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force
        
        # Persistence
        if (-not (Get-ScheduledTask -TaskName "UnifiedEnterpriseAgent" -ErrorAction SilentlyContinue)) {
            $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -File `"$ScriptPath`""
            $Trigger = New-ScheduledTaskTrigger -AtStartup
            $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
            Register-ScheduledTask -TaskName "UnifiedEnterpriseAgent" -Action $Action -Trigger $Trigger -Principal $Principal -Force
            Log-Message "Persistence Installed (Scheduled Task: UnifiedEnterpriseAgent)"
        }
    }

    # Load Config fallback
    if (Test-Path $ConfigPath) {
        $SavedConfig = Get-Content $ConfigPath | ConvertFrom-Json
        if ($ServerUrl -eq "https://unified-manager.vercel.app") {
             if ($SavedConfig.ServerUrl -and $SavedConfig.ServerUrl -notlike "*eqncs.com*") {
                $ServerUrl = $SavedConfig.ServerUrl
             }
        }
    }

    Log-Message "Agent v$Version Started. ID: $AgentId"

    while ($true) {
        try {
            # 1. Update Check
            $UpdateRes = Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -Method Get -ErrorAction SilentlyContinue
            if ($UpdateRes -and $UpdateRes.Headers -and $UpdateRes.Headers['X-Agent-Version']) {
                $LatestVersion = $UpdateRes.Headers['X-Agent-Version']
                if ([version]$LatestVersion -gt [version]$Version) {
                    Log-Message "Update Found! Version $LatestVersion. Downloading..."
                    $UpdateRes.Content | Out-File -FilePath "$ScriptPath.new" -Force
                    Move-Item -Path "$ScriptPath.new" -Destination $ScriptPath -Force
                    Log-Message "Update Applied. Restarting..."
                    Start-Process powershell.exe -ArgumentList "-File `"$ScriptPath`"" -WindowStyle Hidden
                    exit
                }
            }

            # 2. Heartbeat
            $Body = @{
                agentId = $AgentId
                serialNumber = $SerialNumber
                deviceName = $env:COMPUTERNAME
                publicIp = (Invoke-RestMethod -Uri "https://api.ipify.org")
                localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress
                os = (Get-CimInstance Win32_OperatingSystem).Caption
                version = $Version
            }

            Log-Message "Heartbeat to $ServerUrl..."
            $Response = Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/heartbeat" -Body ($Body | ConvertTo-Json) -ContentType "application/json"
            
            if ($Response.success) {
                if ($Response.commands) {
                    foreach ($cmd in $Response.commands) {
                        Log-Message "Executing: $($cmd.type)"
                        $Result = ""
                        try {
                            if ($cmd.type -eq "shell") {
                                $Result = Invoke-Expression $cmd.payload.command | Out-String
                            } elseif ($cmd.type -eq "software") {
                                $Result = Get-Package | Select-Object Name, Version, ProviderName | ConvertTo-Json
                            }
                            
                            Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/result" -Body (@{
                                agentId = $AgentId
                                type = $cmd.type
                                data = $Result
                            } | ConvertTo-Json) -ContentType "application/json"
                        } catch {
                            Log-Message "Exec Error: $_"
                        }
                    }
                }
            }
        } catch {
            Log-Message "Heartbeat Error: $($_.Exception.Message)"
        }
        Start-Sleep -Seconds 20
    }
} catch {
    Log-Message "CRITICAL ERROR: $_"
}
