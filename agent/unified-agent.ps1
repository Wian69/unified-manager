param(
    $ServerUrl = "https://unified-manager.vercel.app"
)

# Unified Enterprise Agent (UEA)
# Version: 1.3.1
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
    Write-Host $Line
    if ($LogFile) {
        if (-not (Test-Path (Split-Path $LogFile))) { New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force }
        $Line | Out-File -FilePath $LogFile -Append
    }
}

try {
    $AgentId = (Get-CimInstance Win32_ComputerSystemProduct).UUID
    $SerialNumber = (Get-CimInstance Win32_Bios).SerialNumber
    $Version = "1.3.1"
    $HeartbeatCount = 0

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
        Log-Message "Installing/Repairing agent persistence to $ScriptPath..."
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
            # Executed from memory (iex), we must download ourselves to disk
            Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -OutFile "$ScriptPath"
        }
        
        # Initial Config
        $Config = @{ ServerUrl = $ServerUrl; Version = $Version }
        $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force
        
        # Persistence (Aggressive overwrite to fix execution policies and add immortality)
        $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""
        
        # Trigger 1: Boot
        $Trigger1 = New-ScheduledTaskTrigger -AtStartup
        
        # Trigger 2: Every 5 minutes (Auto-Resuscitation)
        $Trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
        
        $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        Register-ScheduledTask -TaskName "UnifiedEnterpriseAgent" -Action $Action -Trigger @($Trigger1, $Trigger2) -Principal $Principal -Force
        Log-Message "Persistence Installed (Scheduled Task: UnifiedEnterpriseAgent - Auto-Resuscitation Enabled)"
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

    while ($true) {
        try {
            $UpdateTriggered = $false

            # 1. Update Check (Redundant Path 1: Direct Header Check)
            try {
                $UpdateRes = Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -Method Get -MaximumRedirection 0 -ErrorAction SilentlyContinue
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
                            } elseif ($cmd.type -eq "software") {
                                $Result = Get-Package | Select-Object Name, Version, ProviderName | ConvertTo-Json
                            } elseif ($cmd.type -eq "Message") {
                                $msg = $cmd.payload.text
                                $PopupScript = "$InstallDir\popup.ps1"
                                $WinFormsCode = @"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
`$Form = New-Object Windows.Forms.Form
`$Form.Text = 'Equinox IT Support'
`$Form.Size = New-Object Drawing.Size(500,220)
`$Form.StartPosition = 'CenterScreen'
`$Form.TopMost = `$True
`$Form.FormBorderStyle = 'FixedDialog'
`$Form.MaximizeBox = `$False
`$Form.MinimizeBox = `$False
`$Form.BackColor = [System.Drawing.Color]::White

# Logo
`$IconBox = New-Object Windows.Forms.PictureBox
`$IconBox.Size = New-Object Drawing.Size(64, 64)
`$IconBox.Location = New-Object Drawing.Point(30, 40)
`$IconBox.SizeMode = 'StretchImage'
try { `$Web = New-Object System.Net.WebClient; `$ImgBytes = `$Web.DownloadData('https://img.icons8.com/color/96/000000/it-support.png'); `$IconBox.Image = [System.Drawing.Image]::FromStream((New-Object IO.MemoryStream(`$ImgBytes, 0, `$ImgBytes.Length))) } catch { }

# Message
`$Label = New-Object Windows.Forms.Label
`$Label.Text = '$msg'
`$Label.Font = New-Object Drawing.Font('Segoe UI', 10)
`$Label.Location = New-Object Drawing.Point(120, 40)
`$Label.Size = New-Object Drawing.Size(340, 80)

# Button
`$Button = New-Object Windows.Forms.Button
`$Button.Text = 'Acknowledge'
`$Button.Font = New-Object Drawing.Font('Segoe UI', 9)
`$Button.Size = New-Object Drawing.Size(120, 35)
`$Button.Location = New-Object Drawing.Point(340, 130)
`$Button.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
`$Button.ForeColor = [System.Drawing.Color]::White
`$Button.FlatStyle = 'Flat'
`$Button.Add_Click({ `$Form.Close() })

`$Form.Controls.Add(`$Label)
`$Form.Controls.Add(`$IconBox)
`$Form.Controls.Add(`$Button)
`$Form.ShowDialog()
"@
                                $WinFormsCode | Out-File -FilePath $PopupScript -Force -Encoding utf8
                                
                                $ActiveUser = (Get-WmiObject -Class Win32_ComputerSystem).UserName
                                if ($ActiveUser) {
                                    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PopupScript`""
                                    $Principal = New-ScheduledTaskPrincipal -UserId $ActiveUser -LogonType Interactive
                                    Register-ScheduledTask -TaskName "UnifiedAgentPopup" -Action $Action -Principal $Principal -Force | Out-Null
                                    Start-ScheduledTask -TaskName "UnifiedAgentPopup" | Out-Null
                                    Start-Sleep -Seconds 2
                                    Unregister-ScheduledTask -TaskName "UnifiedAgentPopup" -Confirm:$false | Out-Null
                                    $Result = "Professional UI Message Triggered on Active Desktop session: $ActiveUser"
                                } else {
                                    $Result = "Skipped UI Message: No active user logged in."
                                }
                            } elseif ($cmd.type -eq "Restart") {
                                Log-Message "Restart initiated by Admin."
                                Restart-Computer -Force
                                $Result = "System Restarting..."
                            } elseif ($cmd.type -eq "Rename") {
                                $newName = $cmd.payload.newName
                                Rename-Computer -NewName $newName -Force
                                $Result = "Computer renamed to $newName (Restart Required)"
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
        Start-Sleep -Seconds 5
    }
} catch {
    Log-Message "CRITICAL ERROR: $_"
}
