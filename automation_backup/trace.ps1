$ServerUrl = "https://unified-manager.vercel.app"
Write-Host "Trace Start"
[Net.ServicePointManager]::SecurityProtocol = "Tls, Tls11, Tls12"
$AgentId = (Get-CimInstance Win32_ComputerSystemProduct).UUID
$SerialNumber = (Get-CimInstance Win32_Bios).SerialNumber
$OS = (Get-CimInstance Win32_OperatingSystem).Caption
$PubIp = (Invoke-RestMethod -Uri "https://api.ipify.org?format=json").ip
$LocIp = (Get-NetIPAddress | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | Select-Object -First 1).IPAddress

$Payload = @{
    agentId = $AgentId; serialNumber = $SerialNumber; version = "1.6.2"; status = "online"
    deviceName = $env:COMPUTERNAME; os = $OS; publicIp = $PubIp; localIp = $LocIp; isp = "Enterprise-Debug"
}
$BodyJson = $Payload | ConvertTo-Json
Write-Host "Sending Payload: $BodyJson"
$Response = Invoke-RestMethod -Method Post -Uri "$ServerUrl/api/agent/heartbeat" -Body $BodyJson -ContentType "application/json"
Write-Host "Server Response: $($Response | ConvertTo-Json)"
Write-Host "Trace Complete"
