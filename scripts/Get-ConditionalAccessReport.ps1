Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   CONDITIONAL ACCESS AUDIT SCRIPT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "`n1. Securely connecting to your tenant..."
# This will pop up a Microsoft Login Window for you to authenticate
Connect-MgGraph -Scopes "Policy.Read.All", "Policy.ReadWrite.ConditionalAccess"

Write-Host "2. Fetching all Conditional Access Policies..."
$policies = Get-MgIdentityConditionalAccessPolicy

Write-Host "3. Generating Security Report..."
$policies | Select-Object Id, DisplayName, State, Conditions, GrantControls, SessionControls | ConvertTo-Json -Depth 5 | Out-File "CA-Policies-Audit.json"

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "Audit Complete! Your policies have been saved to CA-Policies-Audit.json" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
