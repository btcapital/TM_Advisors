<#
  set-site-url.ps1
  ------------------------------------------------------------------
  Points every absolute URL in the site at wherever it is actually hosted.

  Rewrites: <link rel=canonical>, og:url, og:image, the contact form's
  _next redirect, <base> in 404.html, robots.txt and sitemap.xml.
  Also flips the noindex flag.

  The GitHub Pages prototype URL (current):

      .\tools\set-site-url.ps1 -BaseUrl "https://www.carolinasmc.com/TM_Advisors/" -NoIndex

  Production, once tmadvisors.com points at this repo:

      .\tools\set-site-url.ps1 -BaseUrl "https://www.tmadvisors.com/"

  -NoIndex adds <meta name="robots" content="noindex,nofollow"> to every
  page. Use it for any deployment that is not the real production site, so
  a prototype cannot be indexed under someone else's domain.
  ------------------------------------------------------------------
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$BaseUrl,
  [switch]$NoIndex,
  [string]$Root = (Join-Path $PSScriptRoot '..')
)

if ($BaseUrl -notmatch '/$') { $BaseUrl += '/' }
if ($BaseUrl -notmatch '^https?://') { throw "BaseUrl must start with http:// or https://" }

$uri      = [System.Uri]$BaseUrl
$basePath = $uri.AbsolutePath              # "/TM_Advisors/" or "/"
$Root     = (Resolve-Path $Root).Path
$utf8     = New-Object System.Text.UTF8Encoding($false)

Write-Host "Base URL : $BaseUrl"
Write-Host "Base path: $basePath"
Write-Host "Indexing : $(if ($NoIndex) {'BLOCKED (noindex)'} else {'allowed'})"
Write-Host ''

$pages = Get-ChildItem $Root -Filter *.html
foreach ($f in $pages) {
  $t = $utf8.GetString([System.IO.File]::ReadAllBytes($f.FullName))
  $orig = $t

  # canonical + og:url -> this exact page
  $t = [regex]::Replace($t, '(<link rel="canonical" href=")[^"]*(">)', "`${1}$BaseUrl$($f.Name -replace '^index\.html$','')`${2}")
  $t = [regex]::Replace($t, '(<meta property="og:url" content=")[^"]*(">)', "`${1}$BaseUrl$($f.Name -replace '^index\.html$','')`${2}")

  # og:image + form redirect + apple touch icon
  $t = [regex]::Replace($t, '(<meta property="og:image" content=")[^"]*(">)', "`${1}${BaseUrl}assets/img/og-card.png`${2}")
  $t = [regex]::Replace($t, '(name="_next" value=")[^"]*(">)', "`${1}${BaseUrl}thank-you.html`${2}")

  # 404.html is served for arbitrary deep paths, so relative URLs break.
  # <base> anchors every relative URL on that page to the site root.
  if ($f.Name -eq '404.html') {
    if ($t -match '<base href="[^"]*">') {
      $t = [regex]::Replace($t, '<base href="[^"]*">', "<base href=`"$basePath`">")
    } else {
      $t = $t -replace '(<meta name="viewport"[^>]*>)', "`$1`n<base href=`"$basePath`">"
    }
  }

  # Robots. Strip EVERY existing robots meta first, then write exactly one.
  # (Leaving a stale "index,follow" next to a new "noindex" is ambiguous:
  # crawlers resolve conflicting directives to the most restrictive, so the
  # page silently becomes noindex even when indexing was intended.)
  $t = [regex]::Replace($t, '[ \t]*<meta name="robots"[^>]*>\r?\n?', '')
  $robotsTag = if ($NoIndex) { '<meta name="robots" content="noindex,nofollow">' }
               else          { '<meta name="robots" content="index,follow,max-image-preview:large">' }
  # 404 and thank-you are always noindex regardless of mode.
  if ($f.Name -in @('404.html', 'thank-you.html')) {
    $robotsTag = '<meta name="robots" content="noindex,follow">'
  }
  $t = $t -replace '(<meta name="viewport"[^>]*>)', "`$1`n$robotsTag"

  if ($t -ne $orig) {
    [System.IO.File]::WriteAllText($f.FullName, $t, $utf8)
    "  updated  $($f.Name)"
  }
}

# robots.txt
$robots = Join-Path $Root 'robots.txt'
if (Test-Path $robots) {
  $body = if ($NoIndex) {
    "User-agent: *`nDisallow: /`n"
  } else {
    "User-agent: *`nAllow: /`n`nSitemap: ${BaseUrl}sitemap.xml`n"
  }
  [System.IO.File]::WriteAllText($robots, $body, $utf8)
  '  updated  robots.txt'
}

# sitemap.xml
$sitemap = Join-Path $Root 'sitemap.xml'
if (Test-Path $sitemap) {
  $t = $utf8.GetString([System.IO.File]::ReadAllBytes($sitemap))
  $t = [regex]::Replace($t, '<loc>https?://[^<]*?/([^/<]*)</loc>', { param($m) "<loc>$BaseUrl$($m.Groups[1].Value)</loc>" })
  [System.IO.File]::WriteAllText($sitemap, $t, $utf8)
  '  updated  sitemap.xml'
}

''
Write-Host 'Done. Review with: git diff' -ForegroundColor Green
if ($basePath -ne '/') {
  Write-Host "NOTE: hosted at a subpath ($basePath). robots.txt and sitemap.xml are only honoured at a domain root, so they will be ignored here. The per-page noindex tag is what actually protects a subpath deployment." -ForegroundColor Yellow
}
