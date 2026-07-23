<#
  check-no-emdash.ps1
  ------------------------------------------------------------------
  House rule: this site contains NO em dashes.

  Fails (exit code 1) if an em dash, en dash, or either HTML entity
  turns up in any source file. Run it before every push.

      .\tools\check-no-emdash.ps1

  Use a comma, a colon, or two sentences instead.
  ------------------------------------------------------------------
#>
[CmdletBinding()]
param([string]$Root = (Join-Path $PSScriptRoot '..'))

$utf8 = New-Object System.Text.UTF8Encoding($false)
# Built from codepoints so this script stays pure ASCII and cannot self-corrupt.
$tokens = @(
  @{ Name = 'em dash';    Value = [string][char]0x2014 },
  @{ Name = 'en dash';    Value = [string][char]0x2013 },
  @{ Name = '&mdash;';    Value = '&mdash;' },
  @{ Name = '&ndash;';    Value = '&ndash;' }
)

$files = Get-ChildItem $Root -Recurse -Include *.html, *.css, *.js, *.md, *.txt, *.xml |
         Where-Object { $_.FullName -notmatch '[\\/](\.git|node_modules)[\\/]' }

$found = 0
foreach ($f in $files) {
  $lines = ($utf8.GetString([System.IO.File]::ReadAllBytes($f.FullName))) -split "`r?`n"
  for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($tok in $tokens) {
      if ($lines[$i].Contains($tok.Value)) {
        $rel = $f.FullName.Substring((Resolve-Path $Root).Path.Length + 1)
        "{0}:{1}  [{2}]  {3}" -f $rel, ($i + 1), $tok.Name, $lines[$i].Trim()
        $found++
      }
    }
  }
}

''
if ($found -gt 0) {
  Write-Host "FAIL: $found dash violation(s). Replace with a comma, a colon, or a full stop." -ForegroundColor Red
  exit 1
}
Write-Host 'PASS: no em dashes anywhere.' -ForegroundColor Green
