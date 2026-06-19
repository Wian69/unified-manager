$ErrorActionPreference = "Stop"

Write-Host "Authenticating to Azure..."
$Env:AZURE_PS_DISABLE_WAM = "true"
Connect-AzAccount -UseDeviceAuthentication

$ResourceGroupName = "rg-geos-prod"
$ZoneName = "eqncs.com"

Write-Host "Adding DNS records for dev.eqncs.com..."

# DEV TXT
$devTxtRecords = @(
    (New-AzDnsRecordConfig -Value "ms-domain-verification=c520fdb4-e492-407c-8dec-c6120dc2276e"),
    (New-AzDnsRecordConfig -Value "v=spf1 include:spf.protection.outlook.com -all")
)
New-AzDnsRecordSet -ResourceGroupName $ResourceGroupName -ZoneName $ZoneName -Name "dev" -RecordType TXT -Ttl 3600 -DnsRecords $devTxtRecords -Overwrite

# DEV CNAME
New-AzDnsRecordSet -ResourceGroupName $ResourceGroupName -ZoneName $ZoneName -Name "selector1-azurecomm-prod-net._domainkey.dev" -RecordType CNAME -Ttl 3600 -DnsRecords (New-AzDnsRecordConfig -Cname "selector1-azurecomm-prod-net._domainkey.azurecomm.net") -Overwrite
New-AzDnsRecordSet -ResourceGroupName $ResourceGroupName -ZoneName $ZoneName -Name "selector2-azurecomm-prod-net._domainkey.dev" -RecordType CNAME -Ttl 3600 -DnsRecords (New-AzDnsRecordConfig -Cname "selector2-azurecomm-prod-net._domainkey.azurecomm.net") -Overwrite


Write-Host "Adding DNS records for staging.eqncs.com..."

# STAGING TXT
$stagingTxtRecords = @(
    (New-AzDnsRecordConfig -Value "ms-domain-verification=99210dc1-d275-46f0-b655-76b346a9db14"),
    (New-AzDnsRecordConfig -Value "v=spf1 include:spf.protection.outlook.com -all")
)
New-AzDnsRecordSet -ResourceGroupName $ResourceGroupName -ZoneName $ZoneName -Name "staging" -RecordType TXT -Ttl 3600 -DnsRecords $stagingTxtRecords -Overwrite

# STAGING CNAME
New-AzDnsRecordSet -ResourceGroupName $ResourceGroupName -ZoneName $ZoneName -Name "selector1-azurecomm-prod-net._domainkey.staging" -RecordType CNAME -Ttl 3600 -DnsRecords (New-AzDnsRecordConfig -Cname "selector1-azurecomm-prod-net._domainkey.azurecomm.net") -Overwrite
New-AzDnsRecordSet -ResourceGroupName $ResourceGroupName -ZoneName $ZoneName -Name "selector2-azurecomm-prod-net._domainkey.staging" -RecordType CNAME -Ttl 3600 -DnsRecords (New-AzDnsRecordConfig -Cname "selector2-azurecomm-prod-net._domainkey.azurecomm.net") -Overwrite

Write-Host "All ACS DNS records published successfully!"
