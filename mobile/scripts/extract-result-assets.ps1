param([Parameter(Mandatory=$true)][string]$ReferenceRoot, [Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
$component=[Drawing.Bitmap]::new((Join-Path $ReferenceRoot 'gm-09/02 - Components/09 · Bục kết quả/Bản đồ.png'))
$screen=[Drawing.Bitmap]::new((Join-Path $ReferenceRoot 'gm-10/03 - Màn hình/11 · Vinh danh/Kết quả/Bản đồ.png'))
function Save-Crop($image,$name,$x,$y,$width,$height,$circle=$false) {
  $out=[Drawing.Bitmap]::new($width,$height,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    for($i=0;$i -lt $width;$i++){for($j=0;$j -lt $height;$j++){
      $p=$image.GetPixel($x+$i,$y+$j)
      if($circle){$distance=[Math]::Sqrt([Math]::Pow($i-($width-1)/2,2)+[Math]::Pow($j-($height-1)/2,2));$a=[Math]::Max(0,[Math]::Min(1,($width/2-1)-$distance));$p=[Drawing.Color]::FromArgb([int][Math]::Round(255*$a),$p.R,$p.G,$p.B)}
      $out.SetPixel($i,$j,$p)
    }}
    $out.Save((Join-Path $OutputPath ($name+'.png')),[Drawing.Imaging.ImageFormat]::Png)
  } finally {$out.Dispose()}
}
try {
  Save-Crop $component 'pho' 120 296 240 240 $true
  Save-Crop $component 'rice' 426 296 204 204 $true
  Save-Crop $component 'bun' 714 296 204 204 $true
  Save-Crop $screen 'empty-bowl' 10104 744 440 440
  Save-Crop $screen 'map-illustration' 2096 1552 720 240
  $leaf=[Drawing.Bitmap]::new(50,90,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    for($x=0;$x -lt 46;$x++){for($y=0;$y -lt 86;$y++){
      $p=$component.GetPixel(140+$x,838+$y)
      $a=[int][Math]::Round(255*[Math]::Max(0,[Math]::Min(1,($p.R-70.0)/115.0)))
      $leaf.SetPixel($x+2,$y+2,[Drawing.Color]::FromArgb($a,185,203,155))
    }}
    $leaf.Save((Join-Path $OutputPath 'laurel.png'),[Drawing.Imaging.ImageFormat]::Png)
  } finally {$leaf.Dispose()}
} finally {$component.Dispose();$screen.Dispose()}
Write-Output 'Six isolated reference assets exported. No full screen asset or source modification.'
