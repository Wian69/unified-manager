# Unified Security Agent v1.4.3
# Logic: Heartbeat, Detection, and Direct Command (C2) Remediation
# -----------------------------------------------------------------

$HostURL = "https://unified-manager.vercel.app"
$LogPath = "$env:ProgramData\Microsoft\UnifiedManager\UnifiedSecurityAgent.log"

function Write-Log($Message, $Type = "INFO") {
    $Stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$Stamp] [$Type] $Message" | Out-File -FilePath $LogPath -Append
    Write-Host "[$Type] $Message"
}

function Invoke-Remediation {
    Write-Log "CRITICAL: Direct Remediation Signal Received (C2). Starting Security Pulse..." "ACTION"
    try {
        # 1. Force Windows Update Cycle
        Write-Log "Pushing Windows Update Cycle..."
        $UpdateSession = New-Object -ComObject Microsoft.Update.Session
        $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
        $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and IsHidden=0")
        
        if ($SearchResult.Updates.Count -gt 0) {
            Write-Log "Found $($SearchResult.Updates.Count) updates. Starting Download/Install..."
            $Downloader = $UpdateSession.CreateUpdateDownloader()
            $Downloader.Updates = $SearchResult.Updates
            $Downloader.Download()
            
            $Installer = $UpdateSession.CreateUpdateInstaller()
            $Installer.Updates = $SearchResult.Updates
            $Result = $Installer.Install()
            Write-Log "Patching complete. Result Code: $($Result.ResultCode)" "SUCCESS"
        } else {
            Write-Log "No pending updates found."
        }

        # 2. Security Hardening
        Write-Log "Enforcing Defender Real-time and Behavior Monitoring..."
        Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisableBehaviorMonitoring $false -ErrorAction SilentlyContinue
        Update-MpSignature
        Write-Log "Security posture hardened." "SUCCESS"
    } catch {
        Write-Log "Remediation Failure: $($_.Exception.Message)" "ERROR"
    }
}

function Send-Telemetry {
    Write-Log "Internal Security Pulse Initiated..."
    try {
        # Detection
        $UpdateSession = New-Object -ComObject Microsoft.Update.Session
        $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
        $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and IsHidden=0")
        
        $Missing = @()
        foreach($u in $SearchResult.Updates) { $Missing += $u.Title }

        $Status = "SECURE"
        $Vulns = @()
        if ($SearchResult.Updates.Count -gt 0) { $Status = "VULNERABLE"; $Vulns += "Missing-Security-Patches" }
        if (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired") { $Vulns += "System-PendingReboot" }

        $Payload = @{
            serialNumber = (Get-CimInstance Win32_Bios).SerialNumber
            deviceName = $env:COMPUTERNAME
            updateCount = $SearchResult.Updates.Count
            missingUpdates = $Missing
            vulnerabilities = $Vulns
            status = $Status
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$HostURL/api/security/report" -Method Post -Body $Payload -ContentType "application/json"
        Write-Log "Heartbeat Success. Command Status: $($Response.command)" "SUCCESS"

        # Direct C2 Logic: Check for commands from dashboard response
        if ($Response.command -eq "remediate") {
            Invoke-Remediation
            # Report back again immediately after fix
            Send-Telemetry
        }
    } catch {
        Write-Log "Telemetry Communication Error: $($_.Exception.Message)" "ERROR"
    }
}

# Persistence Layer (Scheduled Task)
if ($args -notcontains "-SkipInstall") {
    $Source = $MyInvocation.MyCommand.Path
    if (![string]::IsNullOrEmpty($Source)) {
        $DestDir = "$env:ProgramData\Microsoft\UnifiedManager"
        if (!(Test-Path $DestDir)) { New-Item $DestDir -ItemType Directory -Force }
        $DestFile = "$DestDir\unified-agent.ps1"
        Copy-Item $Source $DestFile -Force
        
        $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$DestFile`" -SkipInstall"
        $Trigger = New-ScheduledTaskTrigger -At (Get-Date) -Once -RepetitionInterval (New-TimeSpan -Minutes 15)
        Register-ScheduledTask -TaskName "UnifiedSecurityAgent" -Action $Action -Trigger $Trigger -User "SYSTEM" -Force
        Write-Log "Persistence layer established (v1.4.3)." "SUCCESS"
    }
}

# Main Pulse
Send-Telemetry
Write-Log "Agent sequence complete."
