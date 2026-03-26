<#
.SYNOPSIS
    Unified Security Agent - Diagnostic & Remediation Engine.
    OPTIMIZED FOR INTUNE DEPLOYMENT.
#>

# --- CONFIGURATION ---
$HostURL = "http://localhost:3000" # Update to your production URL
$LogPath = "$env:ProgramData\Microsoft\IntuneManagementExtension\Logs\UnifiedSecurityAgent.log"

function Write-Log($Message, $Type = "INFO") {
    $TimeStamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$TimeStamp] [$Type] $Message" | Out-File -FilePath $LogPath -Append
    Write-Output "[$Type] $Message"
}

Write-Log "Initializing Unified Security Agent..."

$Vulnerabilities = @()
$UpdateCount = 0

# --- 1. DEEP UPDATE DETECTION ---
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

# --- 2. DEFENDER VULNERABILITY CHECK ---
try {
    Write-Log "Checking Defender Security Posture..."
    $Status = Get-MpComputerStatus
    if ($Status.RealTimeProtectionEnabled -ne $true) { $Vulnerabilities += "RealTimeProtection-Disabled" }
    if ($Status.AntivirusEnabled -ne $true) { $Vulnerabilities += "Antivirus-Disabled" }
    if ($Status.AntispywareSignatureAge -gt 3) { $Vulnerabilities += "Signatures-Outdated" }
} catch {
    Write-Log "Defender Check Error: $($_.Exception.Message)" "ERROR"
}

# --- 3. ON-DEMAND REMEDIATION (Optional) ---
if ($args -contains "-Remediate") {
    Write-Log "INSTANT REMEDIATION TRIGGERED" "ACTION"
    Start-Process "usoclient.exe" -ArgumentList "StartScan" -Wait
    Update-MpSignature
}

# --- 4. REPORT TO HOST ---
try {
    Write-Log "Reporting findings to host: $HostURL"
    $Payload = @{
        deviceId = (Get-CimInstance Win32_ComputerSystemProduct).UUID
        deviceName = $env:COMPUTERNAME
        vulnerabilities = $Vulnerabilities
        updateCount = $UpdateCount
        status = "Completed"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$HostURL/api/security/report" -Method Post -Body $Payload -ContentType "application/json"
    Write-Log "Telemetry successfully pushed to Unified Manager." "SUCCESS"
} catch {
    Write-Log "Host Communication Failed: $($_.Exception.Message)" "ERROR"
}

Write-Log "Diagnostic sequence complete."
