$baseUrl = "https://raw.githubusercontent.com/dkyazzentwatwa/chatgpt-skills/main/svg-precision-skill/scripts/svg_skill/"
$skillPath = "C:\Users\lyan1\.gemini\antigravity\skills\svg-precision\scripts\svg_skill"
if (-not (Test-Path $skillPath)) { New-Item -Path $skillPath -ItemType Directory -Force | Out-Null }
$files = @("__init__.py", "core.py", "render.py", "validate.py")
foreach ($f in $files) {
  try {
    Invoke-WebRequest -Uri ($baseUrl + $f) -OutFile (Join-Path $skillPath $f) -ErrorAction Stop
    Write-Output "[OK] Fetched $f"
  } catch {
    Write-Warning "Failed $f"
  }
}
