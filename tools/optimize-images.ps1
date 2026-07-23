<#
  optimize-images.ps1
  ------------------------------------------------------------------
  Crops the source portraits to a 4:5 frame, resizes to 720x900 and
  re-encodes as JPEG q85. Also downsizes the logo.

  Uses only System.Drawing (ships with Windows) so it runs anywhere
  without ImageMagick.

  Usage:
    .\tools\optimize-images.ps1 -Source "C:\path\to\TM_Advisors_Home_Page_v1"

  WEBP (optional, ~30% smaller again):
    Install cwebp from https://developers.google.com/speed/webp/download
    then run:  .\tools\optimize-images.ps1 -Webp
  ------------------------------------------------------------------
#>
[CmdletBinding()]
param(
  [string]$Source,
  [string]$OutDir = (Join-Path $PSScriptRoot '..\assets\img'),
  [int]$Width  = 720,
  [int]$Height = 900,
  [int]$Quality = 85,
  # Fraction of the excess height trimmed from the TOP. 0.15 keeps heads
  # comfortably in frame instead of dead-centering the crop.
  [double]$TopBias = 0.15,
  [switch]$Webp
)

Add-Type -AssemblyName System.Drawing

$OutDir   = (Resolve-Path $OutDir).Path
$TeamDir  = Join-Path $OutDir 'team'
New-Item -ItemType Directory -Force $TeamDir | Out-Null

# source file -> published slug
$map = @{
  'rt-Gray.png'              = 'robert-taylor'
  'Brett-Long-gray.png'      = 'brett-long'
  'Andrew-Morgan-gray.png'   = 'andrew-morgan'
  'Bryan-Long-gray.png'      = 'bryan-long'
  'tom-t-Gray.png'           = 'tom-taylor'
  'bt_gray.jpg'              = 'brandon-taylor'
  'bob-q-gray.png'           = 'robert-quayle'
  'Brett-gray.png'           = 'brett-quayle'
  'Tracey-Pannell-gray.png'  = 'tracey-pannell'
}

function Get-JpegEncoder {
  [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }
}

function Convert-Portrait {
  param([string]$In, [string]$Out)

  $src = [System.Drawing.Image]::FromFile($In)
  try {
    $target = $Width / $Height
    $srcAR  = $src.Width / $src.Height

    if ($srcAR -gt $target) {
      $cw = [int][Math]::Round($src.Height * $target); $ch = $src.Height
      $cx = [int](($src.Width - $cw) / 2);             $cy = 0
    } else {
      $cw = $src.Width; $ch = [int][Math]::Round($src.Width / $target)
      $cx = 0;          $cy = [int][Math]::Round(($src.Height - $ch) * $TopBias)
      if ($cy -lt 0) { $cy = 0 }
    }

    $dst = New-Object System.Drawing.Bitmap($Width, $Height)
    $g   = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode  = 'HighQualityBicubic'
    $g.PixelOffsetMode    = 'HighQuality'
    $g.SmoothingMode      = 'HighQuality'
    $g.CompositingQuality = 'HighQuality'
    # White matte behind any alpha channel so PNG transparency doesn't go black
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($src,
      (New-Object System.Drawing.Rectangle 0, 0, $Width, $Height),
      (New-Object System.Drawing.Rectangle $cx, $cy, $cw, $ch),
      [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
      [System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)
    $dst.Save($Out, (Get-JpegEncoder), $ep)
    $dst.Dispose()
  } finally { $src.Dispose() }
}

function Resize-Logo {
  param([string]$In, [string]$Out, [int]$MaxHeight = 120)
  $src = [System.Drawing.Image]::FromFile($In)
  try {
    $h = [Math]::Min($MaxHeight, $src.Height)
    $w = [int][Math]::Round($src.Width * ($h / $src.Height))
    $dst = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $w, $h)
    $g.Dispose()
    $dst.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $dst.Dispose()
  } finally { $src.Dispose() }
}

if (-not $Source) { Write-Host 'No -Source given; skipping conversion.' -ForegroundColor Yellow; return }

$before = 0; $after = 0
foreach ($k in $map.Keys) {
  $in = Join-Path $Source $k
  if (-not (Test-Path $in)) { Write-Warning "missing: $k"; continue }
  $out = Join-Path $TeamDir "$($map[$k]).jpg"
  $before += (Get-Item $in).Length
  Convert-Portrait -In $in -Out $out
  $sz = (Get-Item $out).Length; $after += $sz
  '{0,-26} -> {1,-22} {2,7:N0} KB' -f $k, "$($map[$k]).jpg", ($sz / 1KB)
}

$logo = Join-Path $Source 'TM-ADVISORS-RGB-White-Background-transparent.png'
if (Test-Path $logo) {
  $before += (Get-Item $logo).Length
  Resize-Logo -In $logo -Out (Join-Path $OutDir 'logo-white.png')
  $after  += (Get-Item (Join-Path $OutDir 'logo-white.png')).Length
}

if ($Webp) {
  if (Get-Command cwebp -ErrorAction SilentlyContinue) {
    Get-ChildItem $TeamDir -Filter *.jpg | ForEach-Object {
      cwebp -q 82 -quiet $_.FullName -o ($_.FullName -replace '\.jpg$', '.webp')
    }
    Write-Host 'WebP generated. Wrap <img> in <picture> with a type="image/webp" <source>.' -ForegroundColor Cyan
  } else {
    Write-Warning 'cwebp not on PATH - skipped WebP.'
  }
}

''
'TOTAL  {0:N2} MB  ->  {1:N0} KB   ({2:N1}x smaller)' -f ($before/1MB), ($after/1KB), ($before/[Math]::Max($after,1))
