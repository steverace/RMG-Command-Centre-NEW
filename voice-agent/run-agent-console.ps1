$projectRoot = $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$pythonCandidates = @(
  (Join-Path $projectRoot "agent\.venv\Scripts\python.exe"),
  (Join-Path $projectRoot "..\Race Media Command Centre Voice Agent\agent\.venv\Scripts\python.exe")
)
$python = $pythonCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $python) { throw "No voice-agent Python environment found. Create agent\.venv from agent\requirements.txt first." }
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"

& $python (Join-Path $projectRoot "agent\main.py") console --text --log-level info
