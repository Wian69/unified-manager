# Unified Enterprise Agent (UEA) v1.0.0
# Provides real-time telemetry, remote management, and persistence.

param(
    [string]$ServerUrl = "https://unified-manager.eqncs.com"
)

# Check for Administrator privileges (Required for scheduling tasks)
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "`n[ERROR] CRITICAL: This script must be run with Administrator privileges.`n" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and 'Run as Administrator'.`n"
    Write-Host "Press Enter to exit..."
    Read-Host
    exit 1
}

$AgentId = (Get-CimInstance Win32_ComputerSystemProduct).UUID
$SerialNumber = (Get-CimInstance Win32_Bios).SerialNumber
$Version = "1.0.0"

$InstallDir = "$env:ProgramData\UnifiedAgent"
$ScriptPath = "$InstallDir\unified-agent.ps1"
$LogPath = "$InstallDir\agent.log"
$ConfigPath = "$InstallDir\config.json"

if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force }

if ($ServerUrl -ne "") {
    $Config = @{ ServerUrl = $ServerUrl }
    $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force
} elseif (Test-Path $ConfigPath) {
    $Config = Get-Content -Path $ConfigPath | ConvertFrom-Json
    $ServerUrl = $Config.ServerUrl
} else {
    $ServerUrl = "https://unified-manager.eqncs.com" # Fallback production URL
    $Config = @{ ServerUrl = $ServerUrl }
    $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force
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
                Invoke-AgentCommand -Cmd $cmd
            }
        }
        
        # Periodic version check
        Invoke-AgentUpdate
    } catch {
        Write-Log "Heartbeat Error: $($_.Exception.Message)"
    }
    
    Start-Sleep -Seconds 60
}
