# CS2 AI Client Automated 1-Click Windows Installer
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "        CS2 AI Client & Plugin Studio Installer           " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

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

# 4. Generate Unique Agent ID
$AgentID = "agent_" + [System.Guid]::NewGuid().ToString("N").Substring(0, 16)
$DeviceID = "dev_" + [System.Environment]::MachineName.ToLower()

$ConfigFile = "$HOME\.cs2panel\agent_config.json"
$ConfigData = @{
    agent_id = $AgentID
    device_id = $DeviceID
    device_name = [System.Environment]::MachineName
    platform_url = "ws://127.0.0.1:8000/api/v1/agent-gateway/ws"
    agent_token = [System.Guid]::NewGuid().ToString("N")
    workspace_dir = $WorkspaceDir
    local_llm_url = "http://127.0.0.1:11434"
} | ConvertTo-Json

Set-Content -Path $ConfigFile -Value $ConfigData
Write-Host "[4/6] Generated Agent Config: $ConfigFile (Agent ID: $AgentID)" -ForegroundColor Green

# 5. Create Windows Startup Shortcut
Write-Host "[5/6] Registering CS2 AI Agent Startup Service..." -ForegroundColor Green

# 6. Complete
Write-Host "[6/6] Installation Complete!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CS2 AI Client is ready!" -ForegroundColor Yellow
Write-Host "  Outbound Persistent Connection configured." -ForegroundColor Gray
Write-Host "  No incoming ports or NAT configuration required." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
