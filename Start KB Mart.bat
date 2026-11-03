@echo off
title KB Mart 3D
cd /d "%~dp0"
echo Starting KB Mart 3D presentation...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lib\serve.ps1" -Page "kb-mart-3d.html"
if errorlevel 1 (
  echo.
  echo The local server could not start. Opening the page directly instead ^(needs internet^)...
  start "" "%~dp0kb-mart-3d.html"
  pause
)
