@echo off
echo ========================================
echo MongoDB Auto-Installer
echo ========================================
echo.
echo This will:
echo 1. Download MongoDB 8.0.4
echo 2. Install it silently
echo 3. Start the MongoDB service
echo.
echo This requires Administrator privileges.
echo You may see a UAC prompt - click YES.
echo.
pause

powershell.exe -ExecutionPolicy Bypass -File "%~dp0install-mongodb-simple.ps1"

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo MongoDB should now be running on port 27017
echo.
echo Next step: Restart your app server
echo   Press Ctrl+C in the terminal running npm
echo   Then run: npm run dev
echo.
pause
