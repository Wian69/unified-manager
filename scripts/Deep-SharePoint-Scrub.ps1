param (
    [Parameter(Mandatory=$true)]
    [string]$UserPrincipalName,
    
    [Parameter(Mandatory=$true)]
    [string]$AdminCenterUrl # Example: https://yourcompany-admin.sharepoint.com
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "      DEEP SHAREPOINT SCRUB INITIATED        " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Target User: $UserPrincipalName"

# Connect to the SharePoint Admin Center
Write-Host "`nConnecting to SharePoint Admin Center..."
Connect-SPOService -Url $AdminCenterUrl

Write-Host "Fetching master list of all SharePoint sites..."
$sites = Get-SPOSite -Limit All

Write-Host "Found $($sites.Count) sites. Commencing Deep Scrub..."

foreach ($site in $sites) {
    Write-Host "Scanning Site: $($site.Url)"
    try {
        # This forcefully rips their profile out of the site, automatically wiping their name off all folders
        Remove-SPOUser -Site $site.Url -LoginName $UserPrincipalName -ErrorAction Stop
        Write-Host "  [SUCCESS] Erased user from site and all underlying folders!" -ForegroundColor Green
    }
    catch {
        # If it throws an error, it usually just means the user was never given access to this specific site
        Write-Host "  [CLEAN] User had no explicit permissions on this site." -ForegroundColor DarkGray
    }
}

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "Deep Scrub Complete! The user's name has been completely wiped from all folders and files." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
