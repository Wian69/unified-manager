Import-Module Microsoft.Graph.Users
Connect-MgGraph -Scopes "User.Read.All", "AuditLog.Read.All" -UseDeviceAuthentication

Write-Host "Fetching regular (member) users and sign-in activity..."
$oneMonthAgo = (Get-Date).AddDays(-30)

# Fetch members with SignInActivity
$members = Get-MgUser -Filter "userType eq 'Member'" -Property Id,DisplayName,UserPrincipalName,SignInActivity,AccountEnabled -All

$inactiveMembers = @()
foreach ($member in $members) {
    # Optional: We could skip disabled accounts, but let's include them and show their status
    $lastSignIn = $member.SignInActivity.LastSignInDateTime
    if ($null -eq $lastSignIn -or $lastSignIn -lt $oneMonthAgo) {
        $inactiveMembers += [PSCustomObject]@{
            DisplayName = $member.DisplayName
            UserPrincipalName = $member.UserPrincipalName
            LastSignIn = if ($null -ne $lastSignIn) { $lastSignIn.ToString("yyyy-MM-dd") } else { "Never" }
            Enabled = $member.AccountEnabled
        }
    }
}

Write-Host "Found $($inactiveMembers.Count) inactive members."
$inactiveMembers | ConvertTo-Json -Depth 5 | Out-File inactive_members.json -Encoding utf8
Write-Host "Data saved to inactive_members.json"
