Import-Module MicrosoftTeams -ErrorAction SilentlyContinue
Write-Host "Connecting to Teams..."
Connect-MicrosoftTeams -UseDeviceAuthentication

Write-Host "Creating Application Access Policy..."
$policy = Get-CsApplicationAccessPolicy -Identity "UnifiedManagerTeamsPolicy" -ErrorAction SilentlyContinue
if ($null -eq $policy) {
    New-CsApplicationAccessPolicy -Identity "UnifiedManagerTeamsPolicy" -AppIds "7fb4f9d0-0feb-4124-abab-f6acc712ac89" -Description "Allow Unified Manager to read Teams Export APIs"
} else {
    Write-Host "Policy already exists, updating AppIds..."
    Set-CsApplicationAccessPolicy -Identity "UnifiedManagerTeamsPolicy" -AppIds @("7fb4f9d0-0feb-4124-abab-f6acc712ac89")
}

Write-Host "Granting Application Access Policy to Tenant..."
Grant-CsApplicationAccessPolicy -PolicyName "UnifiedManagerTeamsPolicy" -Global

Write-Host "DONE! Policy is applied."
