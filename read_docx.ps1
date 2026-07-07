Function Get-DocxText {
    param([string]$path)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
    $entry = $zip.GetEntry("word/document.xml")
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $xml = [xml]$reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    $zip.Dispose()
    
    # Extract text nodes
    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
    $textNodes = $xml.SelectNodes("//w:t", $ns)
    $text = ""
    foreach ($node in $textNodes) {
        $text += $node.InnerText + " "
    }
    return $text
}

Write-Host "--- Data & Email Summary ---"
Get-DocxText "C:\!Data\Equinox Outsourced Services\EQNCS Homepage - Information Technology\Policies\Exit interview policies\Data & Email Summary.docx"
Write-Host "`n--- Exit Checklist ---"
Get-DocxText "C:\!Data\Equinox Outsourced Services\EQNCS Homepage - Information Technology\Policies\Exit interview policies\Exit Checklist.docx"
Write-Host "`n--- Offboarding Confirmation Letter ---"
Get-DocxText "C:\!Data\Equinox Outsourced Services\EQNCS Homepage - Information Technology\Policies\Exit interview policies\Offboarding Confirmation Letter.docx"
