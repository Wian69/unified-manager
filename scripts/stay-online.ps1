# Teams Always Online Script v2.1 (Auto-Login Mode)
# Forces status to "Available" using your personal user token for maximum priority.

param (
    [switch]$Login,
    [switch]$Hidden,
    [switch]$Install
)

# --- Configuration ---
$EnvPath = Join-Path $PSScriptRoot "..\.env.local"
$TokenPath = Join-Path $PSScriptRoot "..\.teams_token"
# ---------------------

function Get-Env() {
    if (Test-Path $EnvPath) {
        $lines = Get-Content $EnvPath
        $config = @{}
        foreach ($line in $lines) {
            if ($line -match "^([^=]*)=(.*)$") { $config[$Matches[1].Trim()] = $Matches[2].Trim() }
        }
        return $config
    }
    return $null
}

$Config = Get-Env
if (!$Config) { Write-Host "Error: .env.local not found." -ForegroundColor Red; exit }

$TenantId = $Config.AZURE_TENANT_ID
$ClientId = $Config.AZURE_CLIENT_ID

function Invoke-ModernLogin {
    Write-Host "Launching Login Helper..." -ForegroundColor Cyan
    node "$PSScriptRoot\login-helper.js"
}

function Get-DelegatedAccessToken {
    if (!(Test-Path $TokenPath)) { return $null }
    $RefreshToken = Get-Content $TokenPath
    
    $Body = @{
        client_id     = $ClientId
        client_secret = $Config.AZURE_CLIENT_SECRET
        grant_type    = "refresh_token"
        refresh_token = $RefreshToken
        scope         = "Presence.ReadWrite offline_access User.Read"
    }
    
    try {
        $Response = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token" -Method Post -Body $Body
        if ($Response.refresh_token) { $Response.refresh_token | Out-File -FilePath $TokenPath -Force }
        return $Response.access_token
    } catch {
        return $null
    }
}

function Set-TeamsOnline {
    param($Token)
    $Headers = @{
        Authorization = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    $Body = @{
        availability       = "Available"
        activity           = "Available"
        expirationDuration = "PT1H"
    } | ConvertTo-Json
    
    try {
        $Uri = "https://graph.microsoft.com/v1.0/me/presence/setUserPreferredPresence"
        Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body
        return $true
    } catch {
        return $false
    }
}

# --- Command Routing ---
if ($Login) { Invoke-ModernLogin; exit }
if ($Hidden) { Start-Process powershell.exe -ArgumentList "-WindowStyle Hidden", "-File", "`"$PSCommandPath`"" -WindowStyle Hidden; exit }
if ($Install) {
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -File `"$PSCommandPath`""
    $Trigger = New-ScheduledTaskTrigger -AtLogOn
    Register-ScheduledTask -TaskName "TeamsAlwaysOnline" -Action $Action -Trigger $Trigger -User $env:USERNAME -Force
    Write-Host "Registered as login task." -ForegroundColor Green; exit
}

# --- Main Loop ---
Write-Host "--- Teams Always Online (v2.1) ---" -ForegroundColor Cyan
if (!(Test-Path $TokenPath)) {
    Write-Host "WARNING: No saved login found. Run: .\scripts\stay-online.ps1 -Login" -ForegroundColor Yellow
}

while ($true) {
    if (Test-Connection 8.8.8.8 -Count 1 -Quiet) {
        $Token = Get-DelegatedAccessToken
        if ($Token) {
            $Stamp = Get-Date -Format "HH:mm:ss"
            if (Set-TeamsOnline -Token $Token) {
                Write-Host "[$Stamp] Status set to Available (Green)" -ForegroundColor Green
            } else {
                Write-Host "[$Stamp] Failed to set status." -ForegroundColor Red
            }
        } else {
            Write-Host "Auth Error: Run -Login again." -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds 60
}
