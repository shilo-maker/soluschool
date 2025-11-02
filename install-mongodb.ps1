# MongoDB Auto-Installer for Windows
# Run this script in PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MongoDB Auto-Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit
}

# MongoDB version
$version = "8.0.4"
$downloadUrl = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-$version-signed.msi"
$installerPath = "$env:TEMP\mongodb-installer.msi"

Write-Host "Step 1: Downloading MongoDB $version..." -ForegroundColor Green
Write-Host "Download URL: $downloadUrl" -ForegroundColor Gray
Write-Host ""

try {
    # Download MongoDB installer
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "✓ Download complete!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Download failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download manually from:" -ForegroundColor Yellow
    Write-Host "https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Step 2: Installing MongoDB..." -ForegroundColor Green
Write-Host "This may take a few minutes..." -ForegroundColor Gray
Write-Host ""

try {
    # Install MongoDB silently
    $arguments = @(
        "/i",
        "`"$installerPath`"",
        "ADDLOCAL=`"ServerService,Client`"",
        "SHOULD_INSTALL_COMPASS=0",
        "/qn",
        "/L*V",
        "`"$env:TEMP\mongodb-install.log`""
    )

    Start-Process "msiexec.exe" -ArgumentList $arguments -Wait -NoNewWindow

    Write-Host "✓ Installation complete!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Installation failed: $_" -ForegroundColor Red
    Write-Host "Check log: $env:TEMP\mongodb-install.log" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Add MongoDB to PATH
Write-Host "Step 3: Adding MongoDB to PATH..." -ForegroundColor Green

$mongoPath = "C:\Program Files\MongoDB\Server\8.0\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

if ($currentPath -notlike "*$mongoPath*") {
    [Environment]::SetEnvironmentVariable(
        "Path",
        "$currentPath;$mongoPath",
        "Machine"
    )
    Write-Host "✓ MongoDB added to PATH" -ForegroundColor Green
} else {
    Write-Host "✓ MongoDB already in PATH" -ForegroundColor Green
}
Write-Host ""

# Start MongoDB service
Write-Host "Step 4: Starting MongoDB service..." -ForegroundColor Green

try {
    $service = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue

    if ($service) {
        if ($service.Status -ne "Running") {
            Start-Service -Name "MongoDB"
            Write-Host "✓ MongoDB service started!" -ForegroundColor Green
        } else {
            Write-Host "✓ MongoDB service already running!" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠ MongoDB service not found" -ForegroundColor Yellow
        Write-Host "Service may need manual configuration" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not start service: $_" -ForegroundColor Yellow
}
Write-Host ""

# Verify installation
Write-Host "Step 5: Verifying installation..." -ForegroundColor Green

# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

try {
    $mongoVersion = & "$mongoPath\mongod.exe" --version 2>&1 | Select-String "db version"
    Write-Host "✓ MongoDB installed successfully!" -ForegroundColor Green
    Write-Host "  $mongoVersion" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "⚠ Could not verify installation" -ForegroundColor Yellow
    Write-Host "  MongoDB might still be working" -ForegroundColor Gray
    Write-Host ""
}
Write-Host ""

# Cleanup
Write-Host "Step 6: Cleanup..." -ForegroundColor Green
Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
Write-Host "✓ Temporary files removed" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "MongoDB is now installed and running!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Close and reopen your terminal/PowerShell" -ForegroundColor White
Write-Host "2. Test connection: mongosh" -ForegroundColor White
Write-Host "3. Restart your app: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Connection String (for .env.local):" -ForegroundColor Yellow
Write-Host "MONGODB_URI=mongodb://localhost:27017/soluschool" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
