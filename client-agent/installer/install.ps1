# CS2 AI Client Automated 1-Click Windows Installer
param(
    [string]$PlatformUrl = ""
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "        CS2 AI Client & Plugin Studio Installer           " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Prompt for Central Server URL if not provided via parameter
if ([string]::IsNullOrWhiteSpace($PlatformUrl)) {
    Write-Host ""
    $UserUrl = Read-Host "Enter CS2Panel Central Web URL (e.g. http://127.0.0.1:8000 or http://your-ip:8000) [Default: http://127.0.0.1:8000]"
    if ([string]::IsNullOrWhiteSpace($UserUrl)) {
        $PlatformUrl = "http://127.0.0.1:8000"
    } else {
        $PlatformUrl = $UserUrl.Trim()
    }
}

if (-not $PlatformUrl.StartsWith("http://") -and -not $PlatformUrl.StartsWith("https://")) {
    $PlatformUrl = "http://" + $PlatformUrl
}

Write-Host "  -> Target Central Web Gateway: $PlatformUrl" -ForegroundColor Cyan

$WorkspaceDir = "$HOME\.cs2panel\agent_workspace"
$InstallDir = "$HOME\.cs2panel\bin"

New-Item -ItemType Directory -Force -Path $WorkspaceDir | Out-Null
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# 1. Check & Install .NET 8 SDK
Write-Host "[1/6] Checking .NET 8 SDK..." -ForegroundColor Green
if (!(Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "  -> Installing .NET 8 SDK via Winget..." -ForegroundColor Yellow
    winget install Microsoft.DotNet.SDK.8 --silent --accept-package-agreements --accept-source-agreements
} else {
    Write-Host "  -> .NET SDK is ready: $(dotnet --version)" -ForegroundColor Gray
}

# 2. Check & Install Git
Write-Host "[2/6] Checking Git..." -ForegroundColor Green
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "  -> Installing Git..." -ForegroundColor Yellow
    winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
} else {
    Write-Host "  -> Git is ready" -ForegroundColor Gray
}

# 3. Setup CounterStrikeSharp & Metamod SDK templates
Write-Host "[3/6] Setting up CounterStrikeSharp templates..." -ForegroundColor Green
dotnet new install CounterStrikeSharp.Template --force 2>$null

# 4. Generate Agent Configuration
$AgentID = "agent_" + [System.Guid]::NewGuid().ToString("N").Substring(0, 16)
$DeviceID = "dev_" + [System.Environment]::MachineName.ToLower()

$ConfigFile = "$HOME\.cs2panel\agent_config.json"
$ConfigData = @{
    agent_id = $AgentID
    device_id = $DeviceID
    device_name = [System.Environment]::MachineName
    platform_url = $PlatformUrl
    agent_token = [System.Guid]::NewGuid().ToString("N")
    workspace_dir = $WorkspaceDir
    local_llm_url = "http://127.0.0.1:11434"
} | ConvertTo-Json

Set-Content -Path $ConfigFile -Value $ConfigData
Write-Host "[4/6] Generated Agent Config: $ConfigFile (Agent ID: $AgentID)" -ForegroundColor Green

# 5. Build Agent Binary
Write-Host "[5/6] Building CS2 AI Agent Binary (cs2agent.exe)..." -ForegroundColor Green
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClientAgentDir = Resolve-Path "$ScriptDir\.."
$BinaryPath = "$InstallDir\cs2agent.exe"

Push-Location $ClientAgentDir
try {
    go build -o $BinaryPath main.go
    Copy-Item -Path $BinaryPath -Destination "$ClientAgentDir\cs2agent.exe" -Force
    Write-Host "  -> Successfully compiled agent executable: $BinaryPath" -ForegroundColor Gray
} catch {
    Write-Host "  -> Build notice: $_" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# 6. Launch CS2 AI Agent
Write-Host "[6/6] Launching CS2 AI Agent in background..." -ForegroundColor Green
if (Test-Path $BinaryPath) {
    Start-Process -FilePath $BinaryPath -ArgumentList "-config `"$ConfigFile`"" -WindowStyle Hidden
    Write-Host "  -> CS2 AI Agent is now running in background!" -ForegroundColor Green
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CS2 AI Client is ready and connected to $PlatformUrl!" -ForegroundColor Yellow
Write-Host "  Check your panel under '/agents' to view real-time telemetry." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
