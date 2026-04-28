# Teams Anti-Idle Script v1.0
# Core Logic: Prevent PC sleep/lock and keep Teams status as "Online" via silent activity.

param (
    [switch]$Hidden
)

if ($Hidden) {
    Start-Process powershell.exe -ArgumentList "-WindowStyle Hidden", "-File", "`"$PSCommandPath`"" -WindowStyle Hidden
    exit
}

# 1. Define the Windows API to prevent the system from locking/sleeping
$Source = @"
using System;
using System.Runtime.InteropServices;
public class SleepUtil {
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);
    public const uint ES_CONTINUOUS = 0x80000000;
    public const uint ES_DISPLAY_REQUIRED = 0x00000002;
    public const uint ES_SYSTEM_REQUIRED = 0x00000001;
}
"@
Add-Type -TypeDefinition $Source
Add-Type -AssemblyName System.Windows.Forms

Write-Host "--- Teams Anti-Idle Mode Activated (v1.1) ---" -ForegroundColor Cyan
Write-Host "1. Automatic Lock   : DISABLED"
Write-Host "2. Teams Status     : FORCED ONLINE (Mouse + Keyboard)"
Write-Host "Press Ctrl+C to stop and allow your PC to lock normally again." -ForegroundColor Yellow

# 2. Set the state: Keep Display and System active
[SleepUtil]::SetThreadExecutionState([SleepUtil]::ES_CONTINUOUS -bor [SleepUtil]::ES_DISPLAY_REQUIRED -bor [SleepUtil]::ES_SYSTEM_REQUIRED)

$w = New-Object -ComObject WScript.Shell

try {
    while ($true) {
        $Stamp = Get-Date -Format "HH:mm:ss"
        
        # 3. Mouse Jiggle: Move mouse by 1 pixel and back
        # Teams is very sensitive to mouse movement.
        $Pos = [System.Windows.Forms.Cursor]::Position
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(($Pos.X + 1), ($Pos.Y + 1))
        Start-Sleep -Milliseconds 100
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($Pos.X, $Pos.Y)

        # 4. Keyboard Pulse: Toggle Scroll Lock
        $w.SendKeys('{SCROLLLOCK}')
        $w.SendKeys('{SCROLLLOCK}')
        
        Write-Host "[$Stamp] Pulsing activity (Mouse + Key)..." -ForegroundColor Green
        
        # Pulse every 45 seconds (slightly faster to be safe)
        Start-Sleep -Seconds 45
    }
} finally {
    # 5. Cleanup: Reset internal Windows timers
    [SleepUtil]::SetThreadExecutionState([SleepUtil]::ES_CONTINUOUS)
    Write-Host "Anti-Idle Deactivated." -ForegroundColor Gray
}
