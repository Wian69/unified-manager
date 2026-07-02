Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   INTUNE AUTO-ENROLLMENT AUDIT SCRIPT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "`n1. Securely connecting to your tenant..."
Connect-MgGraph -Scopes "Policy.Read.All", "DeviceManagementConfiguration.Read.All"

Write-Host "2. Fetching MDM Auto-Enrollment Settings (Entra ID)..."
$mdmUri = "https://graph.microsoft.com/beta/policies/mobileDeviceManagementPolicies"
$mdmResponse = Invoke-MgGraphRequest -Method GET -Uri $mdmUri

Write-Host "3. Fetching Device Enrollment Restrictions (Intune)..."
$enrollUri = "https://graph.microsoft.com/beta/deviceManagement/deviceEnrollmentConfigurations"
$enrollResponse = Invoke-MgGraphRequest -Method GET -Uri $enrollUri

Write-Host "4. Generating Audit Report..."
$auditReport = @{
    MDMPolicies = $mdmResponse.value
    EnrollmentRestrictions = $enrollResponse.value
}

$auditReport | ConvertTo-Json -Depth 10 | Out-File "Intune-Audit.json"

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "Audit Complete! Your settings have been saved to Intune-Audit.json" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
