Get-ScheduledTask -TaskName "UEA_Persistence" -ErrorAction SilentlyContinue | Stop-ScheduledTask -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "UEA_Persistence" -Confirm:$false -ErrorAction SilentlyContinue
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\ProgramData\UnifiedAgent\unified-agent.ps1" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\ProgramData\UnifiedAgent\agent.log" -Force -ErrorAction SilentlyContinue
