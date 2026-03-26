# Unified Security Agent v1.4.5
# Logic: Heartbeat, Detection, and Granular Patch-by-Patch Progress
# -----------------------------------------------------------------

$HostURL = "https://unified-manager.vercel.app"
$LogPath = "$env:ProgramData\Microsoft\UnifiedManager\UnifiedSecurityAgent.log"
$SerialNumber = (Get-CimInstance Win32_Bios).SerialNumber

function Write-Log($Message, $Type = "INFO") {
    $Stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$Stamp] [$Type] $Message" | Out-File -FilePath $LogPath -Append
    Write-Host "[$Type] $Message"
}

function Send-Progress($LogMessage) {
    Write-Log "Reporting Progress: $LogMessage"
    try {
        $Payload = @{ serialNumber = $SerialNumber; log = $LogMessage } | ConvertTo-Json
        Invoke-RestMethod -Uri "$HostURL/api/security/progress" -Method Post -Body $Payload -ContentType "application/json"
    } catch {}
}

function Invoke-Remediation {
    Send-Progress "Agent initialized remediation cycle."
    try {
        $UpdateSession = New-Object -ComObject Microsoft.Update.Session
        $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
        $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and IsHidden=0")
        
        $Count = $SearchResult.Updates.Count
        if ($Count -gt 0) {
            Send-Progress "Detected $Count security patches."
            
            # Download Phase
            for ($i = 0; $i -lt $Count; $i++) {
                $Update = $SearchResult.Updates.Item($i)
                Send-Progress "Downloading ($($i+1)/$Count): $($Update.Title)"
                
                $Collection = New-Object -ComObject Microsoft.Update.UpdateColl
                $Collection.Add($Update)
                
                $Downloader = $UpdateSession.CreateUpdateDownloader()
                $Downloader.Updates = $Collection
                $Downloader.Download()
            }
            Send-Progress "All updates downloaded successfully."

            # Installation Phase
            for ($i = 0; $i -lt $Count; $i++) {
                $Update = $SearchResult.Updates.Item($i)
                Send-Progress "Installing ($($i+1)/$Count): $($Update.Title)"
                
                $Collection = New-Object -ComObject Microsoft.Update.UpdateColl
                $Collection.Add($Update)
                
                $Installer = $UpdateSession.CreateUpdateInstaller()
                $Installer.Updates = $Collection
                $Result = $Installer.Install()
                
                $Status = if ($Result.ResultCode -eq 2) { "Completed" } else { "Error ($($Result.ResultCode))" }
                Send-Progress "Patch status: $Status"
            }
            Send-Progress "Unified Patching Cycle Complete."
        } else {
            Send-Progress "System is already current. No action required."
        }

        # 2. Security Hardening
        Send-Progress "Verifying Defender Security Baseline..."
        Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction SilentlyContinue
        Set-MpPreference -DisableBehaviorMonitoring $false -ErrorAction SilentlyContinue
        Update-MpSignature
        Send-Progress "Security configuration hardened."
    } catch {
        Send-Progress "Agent Execution Fault: $($_.Exception.Message)"
    }
}

function Send-Telemetry {
    Write-Log "Internal Security Pulse Initiated..."
    try {
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
            serialNumber = $SerialNumber
            deviceName = $env:COMPUTERNAME
            updateCount = $SearchResult.Updates.Count
            missingUpdates = $Missing
            vulnerabilities = $Vulns
            status = $Status
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$HostURL/api/security/report" -Method Post -Body $Payload -ContentType "application/json"
        Write-Log "Heartbeat Success. Command Status: $($Response.command)" "SUCCESS"

        if ($Response.command -eq "remediate") {
            Invoke-Remediation
            Send-Telemetry # Final report back
        }
    } catch {
        Write-Log "Telemetry Communication Error: $($_.Exception.Message)" "ERROR"
    }
}

# Persistence Layer
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
        Write-Log "Persistence layer established (v1.4.5)." "SUCCESS"
    }
}

Send-Telemetry
Write-Log "Agent sequence complete."
