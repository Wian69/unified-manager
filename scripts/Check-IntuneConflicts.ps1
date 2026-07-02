Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "    INTUNE CONFIGURATION CONFLICT AUDIT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "`n1. Securely connecting to your tenant..."
Connect-MgGraph -Scopes "DeviceManagementConfiguration.Read.All"

Write-Host "2. Fetching all Device Configuration Profiles & Compliance Policies..."

# Fetch Device Configurations
$configUri = "https://graph.microsoft.com/beta/deviceManagement/deviceConfigurations"
$configs = (Invoke-MgGraphRequest -Method GET -Uri $configUri).value

# Fetch Compliance Policies
$compUri = "https://graph.microsoft.com/beta/deviceManagement/deviceCompliancePolicies"
$compliances = (Invoke-MgGraphRequest -Method GET -Uri $compUri).value

$conflicts = @()

Write-Host "`n3. Analyzing for cross-policy conflicts..."

# Check Device Configurations for Conflicts
foreach ($profile in $configs) {
    try {
        $overviewUri = "https://graph.microsoft.com/beta/deviceManagement/deviceConfigurations/$($profile.id)/deviceStatusOverview"
        $overview = Invoke-MgGraphRequest -Method GET -Uri $overviewUri
        
        if ($overview.configurationConflictCount -gt 0) {
            $conflicts += @{
                Type = "Configuration Profile"
                Name = $profile.displayName
                Platform = $profile.platforms
                ConflictCount = $overview.configurationConflictCount
            }
        }
    } catch {
        # Skip if overview isn't supported for this specific profile type
    }
}

# Check Compliance Policies for Conflicts
foreach ($policy in $compliances) {
    try {
        $overviewUri = "https://graph.microsoft.com/beta/deviceManagement/deviceCompliancePolicies/$($policy.id)/deviceStatusOverview"
        $overview = Invoke-MgGraphRequest -Method GET -Uri $overviewUri
        
        if ($overview.configurationConflictCount -gt 0) {
            $conflicts += @{
                Type = "Compliance Policy"
                Name = $policy.displayName
                Platform = $policy.platforms
                ConflictCount = $overview.configurationConflictCount
            }
        }
    } catch {
        # Skip if overview isn't supported
    }
}

$auditReport = @{
    TotalProfilesScanned = $configs.Count + $compliances.Count
    TotalConflictsFound = $conflicts.Count
    ConflictingPolicies = $conflicts
}

$auditReport | ConvertTo-Json -Depth 5 | Out-File "Intune-Conflicts-Audit.json"

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "Audit Complete! Your conflict report has been saved to Intune-Conflicts-Audit.json" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
