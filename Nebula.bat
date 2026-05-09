@echo off
set "targetDir=C:\Users\prata\.gemini\antigravity\scratch\sonic-pill"
cd /d "%targetDir%"

:: Check if Electron is already running
tasklist /fi "imagename eq electron.exe" | find ":" > nul
if errorlevel 1 (
    echo Nebula is already running.
    exit /b
)

:: Launch silently using VBS script to avoid a persistent terminal
echo Set WshShell = CreateObject("WScript.Shell") > launch.vbs
echo WshShell.Run "cmd.exe /c npm start", 0 >> launch.vbs
echo Set WshShell = Nothing >> launch.vbs

wscript.exe launch.vbs
del launch.vbs
exit
