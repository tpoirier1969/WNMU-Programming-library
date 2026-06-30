# Apply WNMU Programming Library Clear All Reset Sync
# Run from the repo base folder.
# This only inserts a script tag into index.html.

$ErrorActionPreference = "Stop"

$indexPath = Join-Path (Get-Location) "index.html"
if (!(Test-Path $indexPath)) {
  throw "index.html not found. Run this from the WNMU-Programming-library repo base."
}

$text = Get-Content -Raw -Path $indexPath
$scriptPath = "js/clear-all-reset-sync.js"
$tag = '  <script defer src="js/clear-all-reset-sync.js?v=1.0.1"></script>'

if ($text.Contains($scriptPath)) {
  Write-Host "Clear All Reset Sync script tag already exists."
  exit 0
}

$preferredAnchors = @(
  '<script defer src="js/active-scope-control.js?v=1.0.0"></script>',
  '<script defer src="js/library-main-ui-v15109.js?v=1.5.109"></script>',
  '<script defer src="js/app-version-check.js?v=1.5.109"></script>'
)

$inserted = $false
foreach ($anchor in $preferredAnchors) {
  if ($text.Contains($anchor)) {
    $text = $text.Replace($anchor, $anchor + "`r`n" + $tag)
    $inserted = $true
    break
  }
}

if (!$inserted) {
  if ($text.Contains("</head>")) {
    $text = $text.Replace("</head>", $tag + "`r`n</head>")
  } else {
    throw "Could not find a safe insertion point in index.html."
  }
}

Set-Content -Path $indexPath -Value $text -Encoding UTF8
Write-Host "Added Clear All Reset Sync script tag to index.html."
