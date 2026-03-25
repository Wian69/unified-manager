param(
    $ServerUrl = "https://unified-manager.vercel.app"
)

# Unified Enterprise Agent (UEA)
# Version: 1.4.6
# Description: Lightweight persistence and telemetry agent for Unified Manager.

$ErrorActionPreference = "Stop"
$LogFile = "$env:ProgramData\UnifiedAgent\agent.log"

# Ghost-Killer: Ensure no other agent instances are running
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*unified-agent.ps1*" -and $_.ProcessId -ne $PID } | ForEach-Object { 
    Write-Host "Stopping legacy agent (PID: $($_.ProcessId))..."
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue 
}

function Log-Message {
    param($Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Line = "[$Timestamp] $Message"
    # Write-Host $Line # Silence console for absolute stealth
    if ($LogFile) {
        try {
            if (-not (Test-Path (Split-Path $LogFile))) { 
                New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force | Out-Null
            }
            $Line | Out-File -FilePath $LogFile -Append -ErrorAction Stop
        } catch {
            # Silence log errors to prevent agent crash in restricted environments
            Write-Warning "Failed to write to log file: $($LogFile)"
        }
    }
}

function Get-RobustId {
    param($Type)
    try {
        if ($Type -eq "UUID") {
            $val = (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue).UUID
            if ($val -and $val -ne "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF") { return $val }
        } else {
            $val = (Get-CimInstance Win32_Bios -ErrorAction SilentlyContinue).SerialNumber
            if ($val -and $val -notmatch "To be filled|Default|None") { return $val }
        }
    } catch {}
    # Fallback to ComputerName + Random (Better than crashing)
    return "$($env:COMPUTERNAME)-$(Get-Random)"
}

try {
    $AgentId = Get-RobustId "UUID"
    $SerialNumber = Get-RobustId "Serial"
    $Version = "1.4.6"
    
    Log-Message "AGENT IDENTIFIED (ROBUST): ID=$AgentId, SERIAL=$SerialNumber"
    Log-Message "Heartbeat interval: 3 seconds"

    $InstallDir = "$env:ProgramData\UnifiedAgent"
    $ScriptPath = "$InstallDir\unified-agent.ps1"
    $ConfigPath = "$InstallDir\config.json"

    # Self-Installation Logic
    $CurrentPath = ""
    if ($PSCommandPath) { $CurrentPath = $PSCommandPath }
    
    # We must install if we aren't running from the final destination, OR if the task is missing/broken
    $TaskExists = Get-ScheduledTask -TaskName "UnifiedEnterpriseAgent" -ErrorAction SilentlyContinue
    $NeedsInstall = ($CurrentPath -ne $ScriptPath) -or (-not $TaskExists)

    if ($NeedsInstall) {
        $IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
        
        if ($IsAdmin) {
            Log-Message "Installing/Repairing agent persistence to $ScriptPath..."
            try {
                if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force }
                
                # Kill existing agent processes to release file lock
                $ExistingProcs = Get-Process | Where-Object { $_.Path -eq $ScriptPath -and $_.Id -ne $PID }
                if ($ExistingProcs) {
                    Log-Message "Stopping existing agent processes for upgrade..."
                    $ExistingProcs | Stop-Process -Force
                    Start-Sleep -Seconds 2
                }

                if ($CurrentPath -ne "") {
                    Copy-Item -Path $CurrentPath -Destination $ScriptPath -Force
                } else {
                    Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -OutFile "$ScriptPath" -UseBasicParsing
                }
                
                # Initial Config
                $Config = @{ ServerUrl = $ServerUrl; Version = $Version }
                $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force
                
                # Persistence
                $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""
                $Trigger1 = New-ScheduledTaskTrigger -AtStartup
                $Trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
                $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
                Register-ScheduledTask -TaskName "UnifiedEnterpriseAgent" -Action $Action -Trigger @($Trigger1, $Trigger2) -Principal $Principal -Force
                Log-Message "Persistence Installed successfully."
            } catch {
                Log-Message "Warning: Persistence installation failed (likely permission denied). Continuing in User-Mode."
            }
        } else {
            Log-Message "User-Mode: Skipping persistence installation (Administrator rights required)."
        }
    }

    # Load Config fallback
    if (Test-Path $ConfigPath) {
        $SavedConfig = Get-Content $ConfigPath | ConvertFrom-Json
        if ($ServerUrl -eq "https://unified-manager.vercel.app") {
             if ($SavedConfig.ServerUrl -and $SavedConfig.ServerUrl -notlike "*eqncs.com*") {
                $ServerUrl = $SavedConfig.ServerUrl
             }
        }
    }

    Log-Message "Agent v$Version Started. ID: $AgentId"

    # Production Sanity Check: If we are pointing to a preview/branch URL, redirect to production
    $ProdUrl = "https://unified-manager.vercel.app"
    if ($ServerUrl -like "*-projects.vercel.app*") {
        Log-Message "Redirecting from Preview URL ($ServerUrl) to Production ($ProdUrl)..."
        $ServerUrl = $ProdUrl
    }

    while ($true) {
        try {
            $UpdateTriggered = $false

            # 1. Update Check (Redundant Path 1: Direct Header Check)
            try {
                $UpdateRes = Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -Method Get -MaximumRedirection 0 -ErrorAction SilentlyContinue -UseBasicParsing
                if ($UpdateRes -and $UpdateRes.Headers -and $UpdateRes.Headers['X-Agent-Version']) {
                    $LatestVersion = $UpdateRes.Headers['X-Agent-Version']
                    if ([version]$LatestVersion -gt [version]$Version) {
                        Log-Message "Update Found (Header)! Version $LatestVersion. Downloading..."
                        $UpdateRes.Content | Out-File -FilePath "$ScriptPath.new" -Force
                        $UpdateTriggered = $true
                    }
                }
            } catch {
                Log-Message "Direct Update Check Failed: $($_.Exception.Message)"
            }

            # 2. Heartbeat & Telemetry
            # Bulletproof IP detection (Socket method)
            $LocalIp = try {
                $uri = [System.Uri]$ServerUrl
                $port = if ($uri.Port -ne -1) { $uri.Port } else { if ($uri.Scheme -eq 'https') { 443 } else { 80 } }
                $socket = New-Object System.Net.Sockets.TcpClient
                $socket.Connect($uri.Host, $port)
                $ip = $socket.Client.LocalEndPoint.Address.IPAddressToString
                $socket.Close()
                $ip
            } catch {
                $fallback = ipconfig | Select-String "IPv4 Address" | ForEach-Object { if ($_ -match '(\d{1,3}\.){3}\d{1,3}') { $matches[0] } } | Where-Object { $_ -notlike "169.254.*" -and $_ -notlike "127.*" } | Select-Object -First 1
                if ($fallback) { $fallback } else { "Unknown" }
            }

            $GeoData = try { Invoke-RestMethod -Uri "http://ip-api.com/json/?fields=status,message,isp,city,country" -TimeoutSec 5 } catch { $null }
            $Isp = if ($GeoData.status -eq "success") { "$($GeoData.isp) ($($GeoData.city))" } else { "Unknown" }
            $UserContext = try { whoami.exe } catch { "Unknown" }

            $Body = @{
                agentId = $AgentId
                serialNumber = $SerialNumber
                deviceName = $env:COMPUTERNAME
                publicIp = (Invoke-RestMethod -Uri "https://api.ipify.org")
                localIp = $LocalIp
                isp = $Isp
                os = (Get-CimInstance Win32_OperatingSystem).Caption + " ($UserContext)"
                version = $Version
            }

            # Remote Log Streaming
            if (Test-Path $LogFile) {
                $Body["lastLog"] = (Get-Content $LogFile -Tail 10 | Out-String).Trim()
            }

            # Throttled Raw Diagnostics (Send every 12 heartbeats ~ 1 min)
            if ($HeartbeatCount % 12 -eq 0) {
                $Body["netInfo"] = @{
                    ipconfig = (ipconfig | Out-String).Trim()
                    netstat  = (netstat -rn | Select-Object -First 50 | Out-String).Trim()
                    arp      = (arp -a | Select-Object -First 50 | Out-String).Trim()
                }
            }
            $HeartbeatCount++

            Log-Message "Heartbeat to $ServerUrl..."
            $Response = Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/heartbeat" -Body ($Body | ConvertTo-Json) -ContentType "application/json"
            
            if ($Response.success) {
                # Update Check (Redundant Path 2: Heartbeat JSON)
                if ($Response.latestVersion -and ([version]$Response.latestVersion -gt [version]$Version) -and -not $UpdateTriggered) {
                     Log-Message "Update Found (Heartbeat)! Version $($Response.latestVersion). Downloading..."
                     Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -OutFile "$ScriptPath.new"
                     $UpdateTriggered = $true
                }

                if ($UpdateTriggered) {
                    Move-Item -Path "$ScriptPath.new" -Destination $ScriptPath -Force
                    Log-Message "Update Applied. Restarting..."
                    Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""
                    exit
                }

                if ($Response.commands -and $Response.commands.Count -gt 0) {
                    Log-Message "Received $($Response.commands.Count) commands."
                    foreach ($cmd in $Response.commands) {
                        Log-Message "Processing ID=$($cmd.id) Type=$($cmd.type)"
                        $Result = ""
                        try {
                            if ($cmd.type -eq "shell" -or $cmd.type -eq "Run-Script") {
                                $ScriptToRun = if ($cmd.payload.command) { $cmd.payload.command } else { $cmd.payload.script }
                                $Result = Invoke-Expression $ScriptToRun | Out-String
                                
                                # If the dashboard requested a specific return type, use it for the result
                                if ($cmd.payload.returnType) { 
                                    $cmd.type = $cmd.payload.returnType 
                                    Log-Message "Overriding result type to: $($cmd.type)"
                                }
                            } elseif ($cmd.type -eq "software") {
                                $Result = Get-Package | Select-Object Name, Version, ProviderName | ConvertTo-Json
                            } elseif ($cmd.type -eq "Message") {
                                $msg = $cmd.payload.text
                                $PopupScript = "$InstallDir\popup.ps1"
                                # Fallback popup script in User/Scratch temp if ProgramData is blocked
                                if (-not (Test-Path (Split-Path $PopupScript))) {
                                    $PopupScript = "$PSScriptRoot\popup.ps1"
                                }
                                
                                # HTA-based Professional Popup (100% Silent GUI)
                                $HtaPath = "$InstallDir\support.hta"
                                $HtaCode = @"
<html>
<head>
<title>Equinox IT Support</title>
<hta:application id="oHTA" border="none" caption="no" innerborder="no" scroll="no" showintaskbar="yes" singleinstance="yes" sysmenu="no" windowstate="normal" />
<style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: white; margin: 0; padding: 0; border: 1px solid #1e293b; overflow: hidden; }
    .header { background: #1e293b; padding: 15px 20px; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 12px; }
    .header img { width: 24px; height: 24px; }
    .header span { font-weight: 800; font-size: 12px; letter-spacing: 1px; color: #38bdf8; text-transform: uppercase; }
    .content { padding: 30px; }
    .message { font-size: 16px; line-height: 1.5; color: #f1f5f9; margin-bottom: 30px; }
    .footer { padding: 0 30px 30px; display: flex; justify-content: flex-end; }
    .btn { background: #0284c7; color: white; border: none; padding: 10px 25px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px; transition: background 0.2s; }
    .btn:hover { background: #0369a1; }
</style>
<script language="vbscript">
    Sub Window_OnLoad
        window.resizeTo 500, 300
        window.moveTo (screen.width - 500) / 2, (screen.height - 300) / 2
    End Sub
    Sub Acknowledge
        Set shell = CreateObject("WScript.Shell")
        ' Send Ack back to server
        cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ""Invoke-RestMethod -Method Post -Uri '$ServerUrl/api/agent/result' -Body (@{ agentId = '$AgentId'; type = 'Message-Ack'; data = 'Acknowledged via HTA' } | ConvertTo-Json) -ContentType 'application/json'"""
        shell.Run cmd, 0, False
        window.close
    End Sub
</script>
</head>
<body>
    <div class="header">
        <img src="https://img.icons8.com/color/48/000000/it-support.png" />
        <span>Equinox IT Support</span>
    </div>
    <div class="content">
        <div class="message">$msg</div>
    </div>
    <div class="footer">
        <button class="btn" onclick="Acknowledge()">Dismiss Message</button>
    </div>
</body>
</html>
"@
                                $HtaCode | Out-File -FilePath $HtaPath -Force -Encoding utf8

                                $ActiveUser = (Get-WmiObject -Class Win32_ComputerSystem).UserName
                                $CurrentSession = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
                                
                                if ($ActiveUser -and $ActiveUser -eq $CurrentSession) {
                                    Log-Message "Direct Session Popup: Launching HTA..."
                                    Start-Process "mshta.exe" -ArgumentList "`"$HtaPath`""
                                    $Result = "Message displayed via HTA in current session: $ActiveUser"
                                } elseif ($ActiveUser) {
                                    Log-Message "Elevated Session Popup: Launching HTA via Scheduled Task..."
                                    try {
                                        $Action = New-ScheduledTaskAction -Execute "mshta.exe" -Argument "`"$HtaPath`""
                                        $Principal = New-ScheduledTaskPrincipal -UserId $ActiveUser -LogonType Interactive
                                        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
                                        
                                        $TaskName = "UnifiedAgentHTA_$(Get-Random)"
                                        Register-ScheduledTask -TaskName $TaskName -Action $Action -Principal $Principal -Settings $Settings -Force | Out-Null
                                        Start-ScheduledTask -TaskName $TaskName | Out-Null
                                        
                                        Start-Sleep -Seconds 5
                                        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
                                        $Result = "Message queued via HTA Scheduled Task for: $ActiveUser"
                                    } catch {
                                        $Result = "Error: Failed to register HTA task. Details: $($_.Exception.Message)"
                                    }
                                } else {
                                    $Result = "Skipped HTA Message: No active user logged in."
                                }
                                
                                # Send initial ACK status
                                Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/result" -Body (@{
                                    agentId = $AgentId
                                    type = "Message-Ack"
                                    data = "REPORT: $Result"
                                } | ConvertTo-Json) -ContentType "application/json"
                            } elseif ($cmd.type -eq "Restart") {
                                Log-Message "Restart initiated by Admin."
                                Restart-Computer -Force
                                $Result = "System Restarting..."
                            } elseif ($cmd.type -eq "Rename") {
                                $newName = $cmd.payload.newName
                                Rename-Computer -NewName $newName -Force
                                $Result = "Computer renamed to $newName (Restart Required)"
                            } elseif ($cmd.type -eq "LocalSearch") {
                                $kw = $cmd.payload.keyword
                                Log-Message "UNIVERSAL SEARCH START: $kw"
                                
                                # 1. Build list of potential search roots
                                $searchRoots = @()
                                # User's current profile
                                $searchRoots += @("$env:USERPROFILE\Desktop", "$env:USERPROFILE\Documents")
                                if ($env:OneDrive) { $searchRoots += $env:OneDrive }
                                
                                # 2. Discover all other OneDrives and Desktops on all fixed drives
                                try {
                                    $fixedDrives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Free -gt 0 }
                                    foreach ($d in $fixedDrives) {
                                        $root = $d.Root
                                        # Look for user profile folders and root-level data folders
                                        $discovered = Get-ChildItem -Path $root -Include "*OneDrive*", "*Desktop*", "*Documents*", "*!Data*" -Directory -Depth 2 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
                                        if ($discovered) { $searchRoots += $discovered }
                                    }
                                } catch {}
                                
                                $finalPaths = $searchRoots | Select-Object -Unique | Where-Object { Test-Path $_ }
                                Log-Message "Scanning Universal Roots: $($finalPaths -join ', ')"

                                $filesFound = @()
                                foreach ($p in $finalPaths) {
                                    try {
                                        $found = Get-ChildItem -Path $p -Filter "*$kw*" -Recurse -File -ErrorAction SilentlyContinue | 
                                            Select-Object Name, FullName, @{Name="Size";Expression={$_.Length}}, LastWriteTime
                                        if ($found) { $filesFound += $found }
                                    } catch {}
                                }
                                
                                $Result = if ($filesFound.Count -gt 0) { $filesFound | ConvertTo-Json } else { "[]" }
                                Log-Message "UNIVERSAL SEARCH END: Found $($filesFound.Count) items."
                            }
                            
                            Log-Message "Result captured ($($Result.Length) chars)"
                            Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/result" -Body (@{
                                agentId = $AgentId
                                type = $cmd.type
                                data = $Result
                            } | ConvertTo-Json) -ContentType "application/json"
                        } catch {
                            Log-Message "Exec Error: $_"
                        }
                    }
                }
            }
        } catch {
            Log-Message "Heartbeat Error: $($_.Exception.Message)"
        }
        Start-Sleep -Seconds 3
    }
} catch {
    Log-Message "CRITICAL ERROR: $_"
}
