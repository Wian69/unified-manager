Import-Module Microsoft.Graph.Users
Connect-MgGraph -Scopes "User.ReadWrite.All" -UseDeviceAuthentication

$json = Get-Content "inactive_guests.json" -Raw | ConvertFrom-Json
$count = 0
$total = $json.Count

Write-Host "Starting bulk deletion of $total inactive guest users..."

foreach ($guest in $json) {
    $count++
    Write-Host "[$count/$total] Deleting $($guest.DisplayName) ($($guest.UserPrincipalName))..."
    try {
        Remove-MgUser -UserId $guest.UserPrincipalName -ErrorAction Stop
        Write-Host "Successfully deleted $($guest.DisplayName)." -ForegroundColor Green
    } catch {
        Write-Host "Failed to delete $($guest.DisplayName): $_" -ForegroundColor Red
    }
}

Write-Host "Deletion process complete."
