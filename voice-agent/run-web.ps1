$projectRoot = $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$node = "C:\Users\race_\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

& $node (Join-Path $projectRoot "serve-livekit-web.mjs")
