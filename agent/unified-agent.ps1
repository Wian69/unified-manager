# Unified Enterprise Agent (UEA) v1.0.0
# Provides real-time telemetry, remote management, and persistence.

$AgentId = (Get-CimInstance Win32_ComputerSystemProduct).UUID
$SerialNumber = (Get-CimInstance Win32_Bios).SerialNumber
$ServerUrl = "http://localhost:3000" # Change to your production URL
$Version = "1.0.0"

$InstallDir = "$env:ProgramData\UnifiedAgent"
$ScriptPath = "$InstallDir\unified-agent.ps1"
$LogPath = "$InstallDir\agent.log"

if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force }

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

function Check-ForUpdates {
    try {
        $Response = Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -Method Get -ErrorAction SilentlyContinue
        $NewVersion = $Response.Headers["X-Agent-Version"]
        
        if ($NewVersion -and $NewVersion -ne $Version) {
            Write-Log "Update Found! Version $NewVersion. Downloading..."
            $NewContent = $Response.Content
            $NewContent | Out-File -FilePath "$ScriptPath.new" -Force
            
            # Simple self-replace on next run or via a small helper
            # For v1.0, we just place it there; the next run will pick it up if we logic it.
            Move-Item -Path "$ScriptPath.new" -Destination $ScriptPath -Force
            Write-Log "Update Applied. Restarting..."
            Restart-Service "UnifiedEnterpriseAgent" -ErrorAction SilentlyContinue # If it was a service
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

function Execute-Command {
    param($Cmd)
    Write-Log "Received Command: $($Cmd.type)"
    
    switch ($Cmd.type) {
        "Message" {
            $msg = $Cmd.payload.text
            Add-Type -AssemblyName PresentationFramework
            [System.Windows.MessageBox]::Show($msg, "System Message")
        }
        "Restart" {
            Write-Log "Restarting System..."
            Restart-Computer -Force
        }
        "Rename" {
            $newName = $Cmd.payload.newName
            Write-Log "Renaming System to $newName..."
            Rename-Computer -NewName $newName -Force
        }
        "SelfUpdate" {
            Check-ForUpdates
        }
    }
}

# Initial Setup
if ($ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($MyInvocation.MyCommand.Path) -ne $ScriptPath) {
    Copy-Item -Path $MyInvocation.MyCommand.Path -Destination $ScriptPath -Force
    Install-Persistence
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

        $Response = Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/heartbeat" -Body ($Payload | ConvertTo-Json) -ContentType "application/json"
        
        if ($Response.commands -and $Response.commands.Count -gt 0) {
            foreach ($cmd in $Response.commands) {
                Execute-Command -Cmd $cmd
            }
        }
        
        # Periodic version check
        Check-ForUpdates
    } catch {
        Write-Log "Heartbeat Error: $($_.Exception.Message)"
    }
    
    Start-Sleep -Seconds 60
}
