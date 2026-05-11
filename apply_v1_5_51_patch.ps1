# WNMU Programming Library v1.5.51 patcher
# Run from the site root folder that contains index.html and program-new.html.
# It makes .bak-v1.5.50 backups before changing either HTML file.

$ErrorActionPreference = "Stop"

function Require-File($Path) {
  if (-not (Test-Path $Path)) {
    throw "Required file not found: $Path. Run this from the WNMU-Programming-library site root."
  }
}

function Ensure-LineAfter($Path, $Needle, $InsertLine) {
  $content = Get-Content -Raw -Path $Path
  if ($content.Contains($InsertLine)) { return $content }
  if (-not $content.Contains($Needle)) {
    throw "Could not find expected script line in $Path: $Needle"
  }
  return $content.Replace($Needle, "$Needle`n  $InsertLine")
}

Require-File "index.html"
Require-File "program-new.html"
Require-File "js/library-workflow.js"
Require-File "js/program-new-bridge.js"

Copy-Item "index.html" "index.html.bak-v1.5.50" -Force
Copy-Item "program-new.html" "program-new.html.bak-v1.5.50" -Force

$index = Get-Content -Raw -Path "index.html"
$index = $index.Replace('styles.css?v=1.5.50', 'styles.css?v=1.5.51')
$index = $index.Replace('<span id="appVersion" class="version-pill">v1.5.50</span>', '<span id="appVersion" class="version-pill">v1.5.51</span>')
$index = Ensure-LineAfter "index.html" '<script defer src="js/events.js?v=1.5.47"></script>' '<script defer src="js/library-workflow.js?v=1.5.51"></script>'
$index = $index.Replace('styles.css?v=1.5.50', 'styles.css?v=1.5.51')
$index = $index.Replace('<span id="appVersion" class="version-pill">v1.5.50</span>', '<span id="appVersion" class="version-pill">v1.5.51</span>')
Set-Content -Path "index.html" -Value $index -NoNewline

$programNew = Get-Content -Raw -Path "program-new.html"
$programNew = $programNew.Replace('WNMU TV Programming Library v1.5.50 · Add Program', 'WNMU TV Programming Library v1.5.51 · Add Program')
$programNew = $programNew.Replace('styles.css?v=1.5.50', 'styles.css?v=1.5.51')
$programNew = $programNew.Replace('<span class="version-pill">v1.5.50</span>', '<span class="version-pill">v1.5.51</span>')
if (-not $programNew.Contains('<script defer src="js/program-new-bridge.js?v=1.5.51"></script>')) {
  $needle = '<script defer src="js/program-new.js?v=1.5.47"></script>'
  if (-not $programNew.Contains($needle)) {
    throw "Could not find expected program-new.js script line in program-new.html."
  }
  $programNew = $programNew.Replace($needle, "$needle`n  <script defer src=`"js/program-new-bridge.js?v=1.5.51`"></script>")
}
Set-Content -Path "program-new.html" -Value $programNew -NoNewline

Write-Host "v1.5.51 patch applied. Backups created: index.html.bak-v1.5.50 and program-new.html.bak-v1.5.50"
Write-Host "Upload/commit: index.html, program-new.html, js/library-workflow.js, js/program-new-bridge.js"
