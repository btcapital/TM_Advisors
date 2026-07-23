<#
  check-links.ps1
  ------------------------------------------------------------------
  Fails (exit 1) if any local href/src in an HTML file points at a
  file that does not exist in the repo.

  External schemes (http, mailto, tel, data) and in-page #anchors are
  skipped, as are two intentional exceptions documented inline.

      .\tools\check-links.ps1
  ------------------------------------------------------------------
#>
[CmdletBinding()]
param([string]$Root = (Join-Path $PSScriptRoot '..'))

$Root = (Resolve-Path $Root).Path
$utf8 = New-Object System.Text.UTF8Encoding($false)
$bad  = 0

# Files that are allowed to be absent (page degrades gracefully without them).
$optional = @(
  'assets/img/accounting-today-2026.png',  # official award artwork, text fallback until supplied
  'assets/img/og-card.png'                 # social share image, optional
)

Get-ChildItem $Root -Filter *.html | ForEach-Object {
  $page = $_.Name
  $t = $utf8.GetString([System.IO.File]::ReadAllBytes($_.FullName))

  # <base href="..."> sets the document base URL. It is a path PREFIX, not a
  # file reference, so remove it before scanning or it looks like a broken link.
  $t = [regex]::Replace($t, '<base\b[^>]*>', '')

  [regex]::Matches($t, '(?:href|src)="([^"#]+?)"') | ForEach-Object {
    $ref = $_.Groups[1].Value
    if ($ref -match '^(https?:|mailto:|tel:|data:)') { return }

    # Strip query string, then resolve to a repo-relative path. A leading "/"
    # means site-root, which for this project is the repo root.
    $clean = ($ref -split '\?')[0].TrimStart('/')
    if ($clean -eq '' -or $clean -eq './') { return }   # link to site/dir root
    if ($optional -contains $clean) { return }

    $target = Join-Path $Root $clean
    if (-not (Test-Path $target)) {
      "MISSING  $page -> $ref"
      $script:bad++
    }
  }
}

''
if ($bad -gt 0) {
  Write-Host "FAIL: $bad broken reference(s)." -ForegroundColor Red
  exit 1
}
Write-Host 'PASS: all local references resolve.' -ForegroundColor Green
