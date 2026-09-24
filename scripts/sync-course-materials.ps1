param(
    [string]$SourceDirectory = 'D:\UIT\IE307',
    [string]$DestinationDirectory = "$PSScriptRoot\..\docs\references\course\files"
)

$resolvedSource = Resolve-Path -LiteralPath $SourceDirectory -ErrorAction Stop
$projectRoot = Resolve-Path -LiteralPath "$PSScriptRoot\.." -ErrorAction Stop
$destinationParent = Split-Path -Parent $DestinationDirectory
New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null
$resolvedDestination = Resolve-Path -LiteralPath $DestinationDirectory -ErrorAction Stop

if (-not $resolvedDestination.Path.StartsWith($projectRoot.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Destination must stay inside the project root."
}

$entries = foreach ($file in Get-ChildItem -LiteralPath $resolvedSource.Path -Filter '*.pdf' -File | Sort-Object Name) {
    $target = Join-Path $resolvedDestination.Path $file.Name
    Copy-Item -LiteralPath $file.FullName -Destination $target -Force
    $hash = Get-FileHash -LiteralPath $target -Algorithm SHA256
    [pscustomobject]@{
        name = $file.Name
        bytes = $file.Length
        lastWriteTimeUtc = $file.LastWriteTimeUtc.ToString('o')
        sha256 = $hash.Hash.ToLowerInvariant()
    }
}

$manifestPath = Join-Path $projectRoot.Path 'docs\references\course\manifest.local.json'
$entries | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Output "Synced $($entries.Count) PDF files. Manifest: $manifestPath"
