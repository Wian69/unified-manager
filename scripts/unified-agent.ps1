<#
.SYNOPSIS
    Unified Security Agent - Diagnostic & Remediation Engine.
    OPTIMIZED FOR INTUNE DEPLOYMENT.
#>

# --- CONFIGURATION ---
$HostURL = "https://unified-manager.vercel.app" # Production URL for reporting findings
$LogPath = "$env:ProgramData\Microsoft\IntuneManagementExtension\Logs\UnifiedSecurityAgent.log"

function Write-Log($Message, $Type = "INFO") {
    $TimeStamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$TimeStamp] [$Type] $Message" | Out-File -FilePath $LogPath -Append
    Write-Output "[$Type] $Message"
}

Write-Log "Initializing Unified Security Agent..."

$Vulnerabilities = @()
$UpdateCount = 0

# --- 1. PERSISTENCE & HEARTBEAT INSTALLATION ---
if ($args -notcontains "-SkipInstall") {
    Write-Log "Deploying persistence layer (Scheduled Task)..."
    try {
        $SourcePath = $MyInvocation.MyCommand.Path
        if ([string]::IsNullOrEmpty($SourcePath)) {
            Write-Log "Persistence Skip: Script not running from a local file (e.g. piped). Deployment requires local file." "WARN"
            return
        }
        $InstallPath = "$env:ProgramData\Microsoft\UnifiedManager"
        if (-not (Test-Path $InstallPath)) { New-Item -Path $InstallPath -ItemType Directory -Force }
        $ScriptPath = "$InstallPath\unified-agent.ps1"
        Copy-Item -Path $SourcePath -Destination $ScriptPath -Force
        
        $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`" -SkipInstall"
        $Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15)
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        
        Register-ScheduledTask -TaskName "UnifiedSecurityAgent" -Action $Action -Trigger $Trigger -Settings $Settings -Force -User "SYSTEM"
        Write-Log "Heartbeat task registered (15m interval)." "SUCCESS"
    } catch {
        Write-Log "Persistence Error: $($_.Exception.Message)" "ERROR"
    }
}

# --- 2. DEEP UPDATE DETECTION ---
try {
    Write-Log "Scanning for critical Windows Updates..."
    $UpdateSession = New-Object -ComObject Microsoft.Update.Session
    $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
    $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and Type='Software' and IsHidden=0")
    $UpdateCount = $SearchResult.Updates.Count
    
    if ($UpdateCount -gt 0) {
        Write-Log "VULNERABILITY DETECTED: $UpdateCount missing security patches." "WARN"
    }
} catch {
    Write-Log "Detection Error: $($_.Exception.Message)" "ERROR"
}

# --- 3. DEFENDER VULNERABILITY CHECK ---
try {
    Write-Log "Checking Defender Security Posture..."
    $Status = Get-MpComputerStatus
    if ($Status.RealTimeProtectionEnabled -ne $true) { $Vulnerabilities += "RealTimeProtection-Disabled" }
    if ($Status.AntivirusEnabled -ne $true) { $Vulnerabilities += "Antivirus-Disabled" }
    if ($Status.AntispywareSignatureAge -gt 3) { $Vulnerabilities += "Signatures-Outdated" }
} catch {
    Write-Log "Defender Check Error: $($_.Exception.Message)" "ERROR"
}

# --- 4. ON-DEMAND REMEDIATION (Optional) ---
if ($args -contains "-Remediate") {
    Write-Log "INSTANT REMEDIATION TRIGGERED" "ACTION"
    Start-Process "usoclient.exe" -ArgumentList "StartScan" -Wait
    Update-MpSignature
}

# --- 5. REPORT TO HOST ---
try {
    Write-Log "Reporting findings to host: $HostURL"
    $SerialNumber = (Get-CimInstance Win32_BIOS).SerialNumber
    $Payload = @{
        deviceId = (Get-CimInstance Win32_ComputerSystemProduct).UUID
        serialNumber = $SerialNumber
        deviceName = $env:COMPUTERNAME
        vulnerabilities = $Vulnerabilities
        updateCount = $UpdateCount
        status = "Active/Reporting"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$HostURL/api/security/report" -Method Post -Body $Payload -ContentType "application/json"
    Write-Log "Telemetry successfully pushed to Unified Manager." "SUCCESS"
} catch {
    Write-Log "Host Communication Failed: $($_.Exception.Message)" "ERROR"
}

Write-Log "Agent sequence complete."
