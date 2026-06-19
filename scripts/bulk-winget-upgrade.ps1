<#
.SYNOPSIS
    Unified Winget Bulk Upgrade Script v3.0
    Designed for Intune Deployment (SYSTEM Context)

.DESCRIPTION
    This script locates the Winget executable (even when running as SYSTEM),
    accepts all agreements, and performs a silent upgrade of all installed
    applications on the device.
#>

$LogPath = "C:\ProgramData\UnifiedManager\Logs\WingetUpgrade.log"
if (!(Test-Path "C:\ProgramData\UnifiedManager\Logs")) { New-Item -Path "C:\ProgramData\UnifiedManager\Logs" -ItemType Directory -Force }

function Write-Log {
    param([string]$Message)
    $Stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Line = "[$Stamp] $Message"
    Write-Host $Line
    $Line | Out-File -FilePath $LogPath -Append
}

Write-Log "Starting Bulk Winget Upgrade..."

# 1. Locate Winget (SYSTEM context handling)
# SYSTEM doesn't always have Winget in the path, we look in the WindowsApps folder
$WingetPath = Get-ChildItem -Path "C:\Program Files\WindowsApps" -Filter "winget.exe" -Recurse -ErrorAction SilentlyContinue | 
               Sort-Object LastWriteTime -Descending | 
               Select-Object -First 1

if ($null -eq $WingetPath) {
    Write-Log "Winget not found in WindowsApps. Falling back to 'winget' command..."
    $WingetCmd = "winget"
} else {
    $WingetCmd = $WingetPath.FullName
    Write-Log "Found Winget at: $WingetCmd"
}

# 2. Accept Source Agreements
Write-Log "Accepting source agreements..."
& $WingetCmd source reset --force
& $WingetCmd source update

# 3. Perform Upgrade
Write-Log "Executing: winget upgrade --all --silent --accept-package-agreements --accept-source-agreements"
try {
    $Output = & $WingetCmd upgrade --all --silent --accept-package-agreements --accept-source-agreements --include-unknown 2>&1 | Out-String
    Write-Log "Upgrade Output Summary:"
    Write-Log $Output
    
    if ($Output -like "*Successfully installed*") {
        Write-Log "RESULT: One or more apps were upgraded successfully."
    } elseif ($Output -like "*No installed package found matching input criteria*") {
        Write-Log "RESULT: All apps are already up to date."
    } else {
        Write-Log "RESULT: Upgrade process completed (see logs for details)."
    }
} catch {
    Write-Log "ERROR: Fatal error during upgrade: $($_.Exception.Message)"
}

Write-Log "Winget Bulk Upgrade Process Finished."
