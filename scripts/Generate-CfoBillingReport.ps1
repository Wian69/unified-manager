$ErrorActionPreference = "Stop"

Write-Host "Gathering Microsoft 365 License Data..."
$skusJson = cmd.exe /c "az rest --method get --url ""https://graph.microsoft.com/v1.0/subscribedSkus"""
$skus = ($skusJson | ConvertFrom-Json).value
$skuMap = @{}
foreach ($sku in $skus) { $skuMap[$sku.skuId] = $sku.skuPartNumber }

# Standard License Pricing Map (Estimated Monthly Cost)
$pricingMap = @{
    "SPB" = 22.00
    "AAD_PREMIUM_P2" = 9.00
    "EXCHANGESTANDARD" = 4.00
    "EXCHANGEENTERPRISE" = 8.00
    "POWER_BI_STANDARD" = 10.00
}

$friendlyNameMap = @{
    "SPB" = "Microsoft 365 Business Premium"
    "AAD_PREMIUM_P2" = "Microsoft Entra ID P2"
    "EXCHANGESTANDARD" = "Exchange Online (Plan 1)"
    "EXCHANGEENTERPRISE" = "Exchange Online (Plan 2)"
    "POWER_BI_STANDARD" = "Power BI Pro"
    "FLOW_FREE" = "Power Automate Free"
    "POWERAPPS_DEV" = "Power Apps Developer"
    "CCIBOTS_PRIVPREV_VIRAL" = "Copilot Studio (Preview)"
}

Write-Host "Fetching users from Microsoft Graph..."
$users = @()
$url = "https://graph.microsoft.com/v1.0/users?`$select=id,displayName,userPrincipalName,assignedLicenses,officeLocation"
do {
    $jsonStr = cmd.exe /c "az rest --method get --url ""$url"""
    $page = $jsonStr | ConvertFrom-Json
    if ($page.value) { $users += $page.value }
    $url = $page.'@odata.nextLink'
} while ($null -ne $url)

$exportData = @()
$endDate = Get-Date -Format "yyyy-MM-dd"
$startDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")

Write-Host "Gathering Azure Billing Data..."
$primaryInvoiceJson = cmd.exe /c "az billing invoice list --account-name ""3fb97818-dfe8-510b-d0f3-be60a5e3e49d:2a308a52-20c8-40e3-b8fd-275e23cf57e6_2019-05-31"" --profile-name ""LMWI-D26L-BG7-PGB"" --period-start-date ""$startDate"" --period-end-date ""$endDate"""
$primaryInvoices = ($primaryInvoiceJson | ConvertFrom-Json)
$recentPrimary = $primaryInvoices | Sort-Object invoiceDate -Descending | Select-Object -First 4
$primaryTotal = ($recentPrimary | ForEach-Object { $_.totalAmount.value } | Measure-Object -Sum).Sum

$secondarySubJson = cmd.exe /c "az billing subscription list --account-name ""3fb97818-dfe8-510b-d0f3-be60a5e3e49d:aedfb1e5-5c75-47f9-8bc6-077a0c21df7c_2019-05-31"" --profile-name ""GAAA-MHOD-BG7-PGB"""
$secondarySubs = ($secondarySubJson | ConvertFrom-Json)
$secondaryTotal = ($secondarySubs | ForEach-Object { $_.lastMonthCharges.value } | Measure-Object -Sum).Sum

$exportData += [PSCustomObject]@{ Category = "SUMMARY COST"; Region = ""; UserOrAccount = "Primary Profile (M365 Licenses)"; Product = "All Licenses"; Cost = $primaryTotal }
$exportData += [PSCustomObject]@{ Category = "SUMMARY COST"; Region = ""; UserOrAccount = "Secondary Profile (Azure Plan)"; Product = "Azure Infrastructure"; Cost = $secondaryTotal }
$exportData += [PSCustomObject]@{ Category = ""; Region = ""; UserOrAccount = ""; Product = ""; Cost = "" }

Write-Host "Processing User License Assignments by Region..."
$regionGroups = @{}

foreach ($user in $users) {
    $regionName = $user.officeLocation
    if ($user.userPrincipalName -match "@partner\.eqncs\.com$") {
        $regionName = "Sub Contractors"
    } elseif (-not $regionName) { 
        $regionName = "Unassigned Region" 
    }

    if (-not $regionGroups.ContainsKey($regionName)) {
        $regionGroups[$regionName] = @{
            usersCount = 0
            totalCost = 0
            products = @{}
        }
    }

    $regionGroups[$regionName].usersCount += 1

    if ($user.assignedLicenses.Count -gt 0) {
        foreach ($license in $user.assignedLicenses) {
            $rawSku = $skuMap[$license.skuId]
            if (-not $rawSku) { $rawSku = $license.skuId }
            
            $productName = if ($friendlyNameMap.ContainsKey($rawSku)) { $friendlyNameMap[$rawSku] } else { $rawSku }
            $unitPrice = if ($pricingMap.ContainsKey($rawSku)) { $pricingMap[$rawSku] } else { 0.00 }

            if (-not $regionGroups[$regionName].products.ContainsKey($productName)) {
                $regionGroups[$regionName].products[$productName] = @{
                    unitPrice = $unitPrice
                    users = @()
                }
            }
            $regionGroups[$regionName].products[$productName].users += $user.userPrincipalName
            $regionGroups[$regionName].totalCost += $unitPrice
            
            $exportData += [PSCustomObject]@{ Category = "USER LICENSE"; Region = $regionName; UserOrAccount = $user.userPrincipalName; Product = $productName; Cost = $unitPrice }
        }
    } else {
        if (-not $regionGroups[$regionName].products.ContainsKey("No Licenses Assigned")) {
            $regionGroups[$regionName].products["No Licenses Assigned"] = @{ unitPrice = 0.00; users = @() }
        }
        $regionGroups[$regionName].products["No Licenses Assigned"].users += $user.userPrincipalName
    }
}

$dashboardReportsPath = "..\public\reports"
if (-not (Test-Path $dashboardReportsPath)) { New-Item -ItemType Directory -Force -Path $dashboardReportsPath | Out-Null }
$reportPath = "$dashboardReportsPath\Microsoft_License_Billing.csv"

# Calculate total M365 Run Rate
$calculatedM365RunRate = 0
foreach ($regionKey in $regionGroups.Keys) {
    $calculatedM365RunRate += $regionGroups[$regionKey].totalCost
}

$projectedNextBill = $calculatedM365RunRate + $secondaryTotal
$lastInvoicePaid = $primaryTotal + $secondaryTotal

# Build Structured JSON for UI and Export Data
$exportData = @()
$exportData += [PSCustomObject]@{ Region = "GLOBAL SUMMARY"; Product = "Last Invoice (Paid)"; Price = "`$$($lastInvoicePaid.ToString('N2'))" }
$exportData += [PSCustomObject]@{ Region = "GLOBAL SUMMARY"; Product = "Projected Next Bill"; Price = "`$$($projectedNextBill.ToString('N2'))" }
$exportData += [PSCustomObject]@{ Region = ""; Product = ""; Price = "" }

$structuredRegions = @()

foreach ($regionKey in $regionGroups.Keys) {
    $rGroup = $regionGroups[$regionKey]
    $structuredProducts = @()
    
    foreach ($prodKey in $rGroup.products.Keys) {
        $pGroup = $rGroup.products[$prodKey]
        $prodTotalCost = $pGroup.unitPrice * $pGroup.users.Count
        
        $structuredProducts += @{
            name = $prodKey
            unitPrice = $pGroup.unitPrice
            totalCost = $prodTotalCost
            users = $pGroup.users
        }
        
        $exportData += [PSCustomObject]@{ 
            Region = $regionKey
            Product = $prodKey
            Price = "`$$($prodTotalCost.ToString('N2'))" 
        }
    }

    $structuredRegions += @{
        name = $regionKey
        totalUsers = $rGroup.usersCount
        totalCost = $rGroup.totalCost
        products = $structuredProducts
    }
}

$jsonData = @{
    totalAmount = $primaryTotal + $secondaryTotal
    primaryCost = $primaryTotal
    secondaryCost = $secondaryTotal
    generatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    regions = $structuredRegions
}

$exportData | Export-Csv -Path $reportPath -NoTypeInformation
Write-Host "CSV Report generated successfully at: $reportPath"

$jsonPath = Join-Path $PWD.Path "..\src\data\billing_data.json"
$jsonString = $jsonData | ConvertTo-Json -Depth 5
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($jsonPath, $jsonString, $utf8NoBom)
Write-Host "JSON Report generated successfully at: $jsonPath"

Write-Host "Adding changes to git..."
if ($env:CI -eq 'true') {
    $git = "git"
    & $git config --global user.email "github-actions[bot]@users.noreply.github.com"
    & $git config --global user.name "github-actions[bot]"
} else {
    $git = "C:\Users\WianDuRandt\AppData\Local\GitHubDesktop\app-3.5.12\resources\app\git\cmd\git.exe"
}

Push-Location ".."
& $git add public/reports/*
& $git add src/data/billing_data.json
& $git commit -m "Automated: Update Billing Data grouped by Region with Friendly Names"
& $git push origin master
Pop-Location
Write-Host "Pushed to GitHub!"
