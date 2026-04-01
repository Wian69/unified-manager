$NukeScript = 'C:\Users\WianDuRandt\.gemini\antigravity\scratch\unified-manager\nuke.ps1'
$NukeCode = @'
Get-ScheduledTask -TaskName "UEA_Persistence" -ErrorAction SilentlyContinue | Stop-ScheduledTask -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "UEA_Persistence" -Confirm:$false -ErrorAction SilentlyContinue
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\ProgramData\UnifiedAgent\unified-agent.ps1" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\ProgramData\UnifiedAgent\agent.log" -Force -ErrorAction SilentlyContinue
'@
$NukeCode | Out-File -FilePath $NukeScript -Force -Encoding utf8

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$NukeScript`""
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "UEA_Nuke" -Action $Action -Principal $Principal | Out-Null
Start-ScheduledTask -TaskName "UEA_Nuke" | Out-Null
Write-Host "SYSTEM Nuke Triggered. Waiting for lock release..."
Start-Sleep -Seconds 10
Unregister-ScheduledTask -TaskName "UEA_Nuke" -Confirm:$false -ErrorAction SilentlyContinue
