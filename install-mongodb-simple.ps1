# MongoDB Simple Installer
# Run in PowerShell as Administrator

Write-Host "MongoDB Installer" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Run as Administrator!" -ForegroundColor Red
    exit
}

# Download
$url = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-8.0.4-signed.msi"
$out = "$env:TEMP\mongodb.msi"

Write-Host "Downloading MongoDB..." -ForegroundColor Green
Invoke-WebRequest -Uri $url -OutFile $out

# Install
Write-Host "Installing MongoDB..." -ForegroundColor Green
Start-Process msiexec.exe -Wait -ArgumentList "/i `"$out`" ADDLOCAL=ServerService,Client SHOULD_INSTALL_COMPASS=0 /qn"

# Start service
Write-Host "Starting MongoDB service..." -ForegroundColor Green
Start-Service MongoDB

# Cleanup
Remove-Item $out

Write-Host ""
Write-Host "Done! MongoDB is installed and running." -ForegroundColor Green
Write-Host ""
