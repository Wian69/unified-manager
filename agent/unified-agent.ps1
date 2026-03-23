# Unified Enterprise Agent (UEA) v1.0.0
# Provides real-time telemetry, remote management, and persistence.

param(
    [string]$ServerUrl = "https://unified-manager.vercel.app"
)

# Check for Administrator or SYSTEM privileges (Required for scheduling tasks)
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) -or $identity.IsSystem)) {
    Write-Host "`n[ERROR] CRITICAL: This script must be run with Administrator or SYSTEM privileges.`n" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and 'Run as Administrator'.`n"
    Write-Host "Press Enter to exit..."
    Read-Host
    exit 1
}

try {
    $AgentId = (Get-CimInstance Win32_ComputerSystemProduct).UUID
    $SerialNumber = (Get-CimInstance Win32_Bios).SerialNumber
    $Version = "1.0.8"

    $InstallDir = "$env:ProgramData\UnifiedAgent"
    $ScriptPath = "$InstallDir\unified-agent.ps1"
    $LogPath = "$InstallDir\agent.log"
    $ConfigPath = "$InstallDir\config.json"

    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force
    }
}
catch {
    Write-Host "`n[ERROR] Initialization Failed: $($_.Exception.Message)`n" -ForegroundColor Red
    Write-Host "Press Enter to exit..."
    Read-Host
    exit 1
}

# Initial Setup (Install to ProgramData if not already there)
$CurrentPath = $PSCommandPath
if (-not [string]::IsNullOrWhiteSpace($CurrentPath) -and $CurrentPath -ne $ScriptPath) {
    Write-Host "Upgrading/Installing agent to $ScriptPath..."
    
    # Kill existing agent processes to release file lock
    $ExistingProcs = Get-Process | Where-Object { $_.Path -eq $ScriptPath -and $_.Id -ne $PID }
    if ($ExistingProcs) {
        Write-Host "Stopping existing agent processes..."
        $ExistingProcs | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }

    Copy-Item -Path $CurrentPath -Destination $ScriptPath -Force
    
    # Force config update on manual run/install
    $Config = @{ ServerUrl = $ServerUrl }
    $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force
    
    Install-Persistence
} elseif ([string]::IsNullOrWhiteSpace($CurrentPath)) {
    Write-Log "Warning: Running without file context (Empty Path). Skipping Copy-Item."
}

# Ensure Config matches current ServerUrl if provided via Param
if ($ServerUrl -ne "https://unified-manager.vercel.app" -or -not (Test-Path $ConfigPath)) {
    $Config = @{ ServerUrl = $ServerUrl }
    $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force
} else {
    $ConfigContent = Get-Content -Path $ConfigPath | ConvertFrom-Json
    $ServerUrl = $ConfigContent.ServerUrl
}

function Write-Log {
    param($Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$Timestamp] $Message" | Out-File -FilePath $LogPath -Append
}

function Install-Persistence {
    try {
        $Action = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""
        $Trigger = New-ScheduledTaskTrigger -AtStartup
        $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        
        Register-ScheduledTask -TaskName "UnifiedEnterpriseAgent" -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force
        Write-Log "Persistence Installed (Scheduled Task: UnifiedEnterpriseAgent)"
    } catch {
        Write-Log "Failed to install persistence: $($_.Exception.Message)"
    }
}

function Invoke-AgentUpdate {
    try {
        $Response = Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -Method Get -ErrorAction SilentlyContinue
        $NewVersion = $Response.Headers["X-Agent-Version"]
        
        if ($NewVersion -and $NewVersion -ne $Version) {
            Write-Log "Update Found! Version $NewVersion. Downloading..."
            $NewContent = $Response.Content
            $NewContent | Out-File -FilePath "$ScriptPath.new" -Force
            
            Move-Item -Path "$ScriptPath.new" -Destination $ScriptPath -Force
            Write-Log "Update Applied. Restarting..."
            Restart-Service "UnifiedEnterpriseAgent" -ErrorAction SilentlyContinue
            exit
        }
    } catch {
        Write-Log "Update Check Failed: $($_.Exception.Message)"
    }
}

function Get-NetworkInfo {
    try {
        $Info = Invoke-RestMethod -Uri "http://ip-api.com/json" -ErrorAction SilentlyContinue
        return @{
            PublicIp = $Info.query
            ISP = $Info.isp
            LocalIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi', 'Ethernet' | Select-Object -First 1).IPAddress
        }
    } catch {
        return @{ PublicIp = "Unknown"; ISP = "Offline"; LocalIp = "Unknown" }
    }
}

function Send-Result {
    param([string]$Type, $Data)
    try {
        $Payload = @{ agentId = $AgentId; type = $Type; data = $Data }
        Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/result" -Body ($Payload | ConvertTo-Json -Depth 5) -ContentType "application/json" -ErrorAction SilentlyContinue
    } catch {
        Write-Log "Failed to send result for $Type"
    }
}

function Invoke-AgentCommand {
    param($Cmd)
    Write-Log "Received Command: $($Cmd.type)"
    
    switch ($Cmd.type) {
        "Run-Script" {
            try {
                $scriptBlock = [scriptblock]::Create($Cmd.payload.script)
                $output = Invoke-Command -ScriptBlock $scriptBlock *>&1 | Out-String
                Send-Result -Type $Cmd.payload.returnType -Data $output
            } catch {
                Send-Result -Type $Cmd.payload.returnType -Data "Error: $($_.Exception.Message)"
            }
        }
        "Message" {
            $msg = $Cmd.payload.text
            Add-Type -AssemblyName PresentationFramework
            [System.Windows.MessageBox]::Show($msg, "System Message")
        }
        "Restart" {
            Write-Log "Restarting System..."
            Restart-Computer -Force
        }
        "SelfUpdate" {
            Invoke-AgentUpdate # Assuming Check-ForUpdates was renamed for verb compliance
        }
        default {
            Write-Log "Unknown command type: $($Cmd.type)"
        }
    }
}

# Initial Setup (Install to ProgramData if not already there)
$CurrentPath = $PSCommandPath
if (-not [string]::IsNullOrWhiteSpace($CurrentPath) -and $CurrentPath -ne $ScriptPath) {
    Write-Log "Installing agent to $ScriptPath..."
    Copy-Item -Path $CurrentPath -Destination $ScriptPath -Force
    Install-Persistence
} elseif ([string]::IsNullOrWhiteSpace($CurrentPath)) {
    # If running as a string/pipe, we can't copy ourselves easily, but we can ensure persistence if we are already there
    Write-Log "Warning: Running without file context (Empty Path). Skipping Copy-Item."
}

Write-Log "Agent v$Version Started. ID: $AgentId"

# Main Heartbeat Loop
while ($true) {
    try {
        $Net = Get-NetworkInfo
        $Payload = @{
            agentId = $AgentId
            serialNumber = $SerialNumber
            deviceName = $env:COMPUTERNAME
            publicIp = $Net.PublicIp
            localIp = $Net.LocalIp
            isp = $Net.ISP
            os = (Get-CimInstance Win32_OperatingSystem).Caption
            version = $Version
        }

        Write-Log "Attempting heartbeat to $ServerUrl..."
        $Response = Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/heartbeat" -Body ($Payload | ConvertTo-Json) -ContentType "application/json"
        
        Write-Log "Heartbeat sent to $ServerUrl. Success: $($Response.success)"
        
        if ($Response.commands -and $Response.commands.Count -gt 0) {
            foreach ($cmd in $Response.commands) {
                Invoke-AgentCommand -Cmd $cmd
            }
        }
        
        # Periodic version check
        Invoke-AgentUpdate
    } catch {
        $msg = $_.Exception.Message
        if ($_.Exception.Response) {
            $msg += " (Status: $($_.Exception.Response.StatusCode))"
        }
        Write-Log "Heartbeat Error: $msg"
    }
    
    Start-Sleep -Seconds 60
}
