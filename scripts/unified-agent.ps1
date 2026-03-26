# Unified Security Agent v1.4.9
# Logic: High-Speed Heartbeat (1-Min), Detection, and Remediation (Fixed Syntax)
# -----------------------------------------------------------------

$HostURL = "https://unified-manager.vercel.app"
$BaseDir = "$env:ProgramData\Microsoft\UnifiedManager"
$LogPath = "$BaseDir\UnifiedSecurityAgent.log"
$SerialNumber = (Get-CimInstance Win32_Bios).SerialNumber

if (!(Test-Path $BaseDir)) { New-Item $BaseDir -ItemType Directory -Force | Out-Null }

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
    Send-Progress "System Signal Received: Initializing Patch Cycle (v1.4.9)"
    try {
        $UpdateSession = New-Object -ComObject Microsoft.Update.Session
        $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
        $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and IsHidden=0")
        
        $Count = $SearchResult.Updates.Count
        if ($Count -gt 0) {
            foreach ($i in 0..($Count-1)) {
                $Update = $SearchResult.Updates.Item($i)
                Send-Progress "Downloading ($($i+1)/$Count): $($Update.Title)"
                $Collection = New-Object -ComObject Microsoft.Update.UpdateColl
                $Collection.Add($Update)
                $Downloader = $UpdateSession.CreateUpdateDownloader()
                $Downloader.Updates = $Collection
                $Downloader.Download()
            }

            foreach ($i in 0..($Count-1)) {
                $Update = $SearchResult.Updates.Item($i)
                Send-Progress "Installing ($($i+1)/$Count): $($Update.Title)"
                $Collection = New-Object -ComObject Microsoft.Update.UpdateColl
                $Collection.Add($Update)
                $Installer = $UpdateSession.CreateUpdateInstaller()
                $Installer.Updates = $Collection
                $Result = $Installer.Install()
            }
            Send-Progress "Remediation successfully completed through the system."
        }
    } catch {
        Send-Progress "Execution Fault: $($_.Exception.Message)"
    }
}

function Send-Telemetry {
    Write-Log "Pulsing security findings to Unified Manager..."
    try {
        $UpdateSearcher = (New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher()
        $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and IsHidden=0")
        
        $Payload = @{
            serialNumber = $SerialNumber
            deviceName = $env:COMPUTERNAME
            updateCount = $SearchResult.Updates.Count
            missingUpdates = @() 
            status = if ($SearchResult.Updates.Count -gt 0) {"VULNERABLE"} else {"SECURE"}
        } | ConvertTo-Json

        $Response = Invoke-RestMethod -Uri "$HostURL/api/security/report" -Method Post -Body $Payload -ContentType "application/json"
        
        if ($Response.command -eq "remediate") {
            Invoke-Remediation
            Send-Telemetry 
        } else {
            Write-Log "Standby: No pending remote commands. Telemetry synced." "SUCCESS"
        }
    } catch { Write-Log "Pulse Fail: $($_.Exception.Message)" "ERROR" }
}

# Persistence Layer - Set to 1 MINUTE
if ($args -notcontains "-SkipInstall") {
    $Source = $MyInvocation.MyCommand.Path
    if (![string]::IsNullOrEmpty($Source)) {
        $DestFile = "$BaseDir\unified-agent.ps1"
        Copy-Item $Source $DestFile -Force
        $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$DestFile`" -SkipInstall"
        
        # High-Speed Trigger: Every 1 Minute
        $Trigger = New-ScheduledTaskTrigger -At (Get-Date) -Once -RepetitionInterval (New-TimeSpan -Minutes 1)
        
        Register-ScheduledTask -TaskName "UnifiedSecurityAgent" -Action $Action -Trigger $Trigger -User "SYSTEM" -Force
        Write-Log "Persistence established (v1.4.9) with 1-minute Heartbeat." "SUCCESS"
    }
}

Send-Telemetry
