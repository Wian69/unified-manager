Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "      INTUNE APP CONFLICT AUDIT SCRIPT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "`n1. Securely connecting to your tenant..."
Connect-MgGraph -Scopes "DeviceManagementApps.Read.All"

Write-Host "2. Fetching all deployed Intune Apps..."
# Fetch the list of apps from Intune
$uri = "https://graph.microsoft.com/beta/deviceAppManagement/mobileApps"
$response = Invoke-MgGraphRequest -Method GET -Uri $uri
$allApps = $response.value

# Create lists to categorize the dangerous app types
$win32Apps = @()
$lobApps = @()

foreach ($app in $allApps) {
    if ($app.'@odata.type' -match "win32LobApp") {
        $win32Apps += $app
    }
    elseif ($app.'@odata.type' -match "windowsMobileMSI" -or $app.'@odata.type' -match "windowsUniversalAppX") {
        $lobApps += $app
    }
}

Write-Host "`n3. Analyzing App Types for Conflicts..."
$auditReport = @{
    TotalAppsFound = $allApps.Count
    Win32AppCount = $win32Apps.Count
    LineOfBusinessAppCount = $lobApps.Count
    Win32Apps = $win32Apps | Select-Object displayName, '@odata.type'
    LineOfBusinessApps = $lobApps | Select-Object displayName, '@odata.type'
}

$auditReport | ConvertTo-Json -Depth 5 | Out-File "Intune-Apps-Audit.json"

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "Audit Complete! Your app list has been saved to Intune-Apps-Audit.json" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
