# Apply WNMU Programming Library Active Scope Control
# Run from the repo base folder.
# This only inserts a script tag into index.html.

$ErrorActionPreference = "Stop"

$indexPath = Join-Path (Get-Location) "index.html"
if (!(Test-Path $indexPath)) {
  throw "index.html not found. Run this from the WNMU-Programming-library repo base."
}

$text = Get-Content -Raw -Path $indexPath
$scriptPath = "js/active-scope-control.js"
$tag = '  <script defer src="js/active-scope-control.js?v=1.0.0"></script>'

if ($text.Contains($scriptPath)) {
  Write-Host "Active Scope script tag already exists."
  exit 0
}

$anchorPattern = '<script defer src="js/library-main-ui-v15109.js?v=1.5.109"></script>'
if ($text.Contains($anchorPattern)) {
  $text = $text.Replace($anchorPattern, $anchorPattern + "`r`n" + $tag)
} elseif ($text.Contains("</head>")) {
  $text = $text.Replace("</head>", $tag + "`r`n</head>")
} else {
  throw "Could not find a safe insertion point in index.html."
}

Set-Content -Path $indexPath -Value $text -Encoding UTF8
Write-Host "Added Active Scope Control script tag to index.html."
