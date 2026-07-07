Import-Module Microsoft.Graph.Users
Connect-MgGraph -Scopes "User.Read.All", "AuditLog.Read.All" -UseDeviceAuthentication

Write-Host "Fetching guest users and sign-in activity..."
$oneMonthAgo = (Get-Date).AddDays(-30)

# Fetch guests with SignInActivity
$guests = Get-MgUser -Filter "userType eq 'Guest'" -Property Id,DisplayName,UserPrincipalName,SignInActivity -All

$inactiveGuests = @()
foreach ($guest in $guests) {
    $lastSignIn = $guest.SignInActivity.LastSignInDateTime
    if ($null -eq $lastSignIn -or $lastSignIn -lt $oneMonthAgo) {
        $inactiveGuests += [PSCustomObject]@{
            DisplayName = $guest.DisplayName
            UserPrincipalName = $guest.UserPrincipalName
            LastSignIn = if ($null -ne $lastSignIn) { $lastSignIn.ToString("yyyy-MM-dd") } else { "Never" }
        }
    }
}

Write-Host "Found $($inactiveGuests.Count) inactive guests."
$inactiveGuests | ConvertTo-Json -Depth 5 | Out-File inactive_guests.json -Encoding utf8
Write-Host "Data saved to inactive_guests.json"
