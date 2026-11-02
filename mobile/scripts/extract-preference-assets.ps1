param([Parameter(Mandatory=$true)][string]$SourcePath, [Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetDirectory = [System.IO.Path]::GetFullPath($OutputPath)
New-Item -ItemType Directory -Path $assetDirectory -Force | Out-Null
$source = [System.Drawing.Bitmap]::FromFile([System.IO.Path]::GetFullPath($SourcePath))
$names = @('bun','noodles','hotpot','rolls','cake','vietnam','japan','china','thailand','europe','leaf','rich','sour','spicy')
try {
  for($i=0;$i -lt $names.Count;$i++) {
    $center=4098+176*$i; $left=$center+60; $right=0; $top=360; $bottom=0
    for($x=$center-60;$x -lt $center+60;$x++){for($y=190;$y -lt 360;$y++){$p=$source.GetPixel($x,$y);if($p.R -lt 110 -and $p.G -lt 150 -and $p.B -lt 130){$left=[Math]::Min($left,$x);$right=[Math]::Max($right,$x);$top=[Math]::Min($top,$y);$bottom=[Math]::Max($bottom,$y)}}}
    if($right -le $left){throw ('No ink found: '+$names[$i])}
    $size=[Math]::Max($right-$left+1,$bottom-$top+1)+8
    $mask=[System.Drawing.Bitmap]::new($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $offsetX=[Math]::Floor(($size-($right-$left+1))/2);$offsetY=[Math]::Floor(($size-($bottom-$top+1))/2)
      for($x=$left;$x -le $right;$x++){for($y=$top;$y -le $bottom;$y++){$p=$source.GetPixel($x,$y);$alpha=[int][Math]::Round(255*[Math]::Clamp((242-$p.G)/183,0,1));$mask.SetPixel($x-$left+$offsetX,$y-$top+$offsetY,[System.Drawing.Color]::FromArgb($alpha,4,59,34))}}
      $mask.Save((Join-Path $assetDirectory ($names[$i]+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
    } finally {$mask.Dispose()}
  }
} finally {$source.Dispose()}
Write-Output ('Extracted '+$names.Count+' transparent glyphs; source unchanged.')
