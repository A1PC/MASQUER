@echo off
REM MASQUER - local launcher (Windows)
REM
REM Double-click this file (or the desktop / start-menu shortcut created by
REM install-shortcut.ps1) to open MASQUER in your default browser. The first
REM run installs deps and builds the app; subsequent runs reuse the build
REM unless src/ is newer than dist/.
REM
REM Close this window to stop the server.

setlocal enabledelayedexpansion

REM Resolve repo root: this script lives at scripts\windows\MASQUER.bat
set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%..\.."
pushd "%REPO_ROOT%" >nul

echo.
echo MASQUER -- local launcher
echo ============================
echo.

REM Locate pnpm on common Windows paths if it's not already on PATH
where pnpm >nul 2>&1
if errorlevel 1 (
  for %%P in (
    "%LOCALAPPDATA%\pnpm"
    "%APPDATA%\npm"
    "%LOCALAPPDATA%\Microsoft\WinGet\Links"
    "%ProgramFiles%\nodejs"
  ) do (
    if exist "%%~P\pnpm.cmd" set "PATH=%%~P;!PATH!"
  )
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] pnpm not found on PATH.
  echo Install it once via one of:
  echo   winget install pnpm.pnpm
  echo   npm install -g pnpm
  echo   irm https://get.pnpm.io/install.ps1 ^| iex
  echo.
  pause
  popd
  exit /b 1
)

REM First-run install
if not exist "node_modules" (
  echo Installing dependencies (first run only, ~1 min)...
  call pnpm install
  if errorlevel 1 goto :fail
)

REM Rebuild if dist/ is missing, or any src/ file is newer than dist/
set "REBUILD=0"
if not exist "dist" set "REBUILD=1"
if "%REBUILD%"=="0" (
  for /f %%F in ('forfiles /p src /s /m *.* /c "cmd /c if @fdate gtr 0 echo 1" 2^>nul ^| find /v ""') do (
    REM Cheap heuristic: any src change → rebuild. forfiles + a date compare
    REM against dist's mtime is awkward in pure cmd, so just check whether
    REM the newest file in src is newer than dist/index.html.
    goto :check_age
  )
)
goto :maybe_build

:check_age
for /f "delims=" %%A in ('powershell -NoProfile -Command "(Get-ChildItem -Recurse src | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime.Ticks"') do set "SRC_TICKS=%%A"
for /f "delims=" %%A in ('powershell -NoProfile -Command "(Get-Item dist).LastWriteTime.Ticks"') do set "DIST_TICKS=%%A"
if "%SRC_TICKS%" gtr "%DIST_TICKS%" set "REBUILD=1"

:maybe_build
if "%REBUILD%"=="1" (
  echo Building MASQUER...
  call pnpm build
  if errorlevel 1 goto :fail
)

REM Pick port (override with MASQUER_PORT env var)
if not defined MASQUER_PORT set "MASQUER_PORT=4173"

echo.
echo Serving on http://localhost:%MASQUER_PORT%
echo Browser will open automatically.
echo Close this window to stop the server.
echo.

REM Start vite preview. /B keeps it in this console so closing the window
REM tears it down. We background it via START /B so the script can poll +
REM open the browser before blocking on the server process.
start "MASQUER-server" /B cmd /c "pnpm exec vite preview --port %MASQUER_PORT% --host 127.0.0.1 --strictPort"

REM Wait for the port to bind, then open the browser
set "TRIES=0"
:wait_for_port
set /a TRIES+=1
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://127.0.0.1:%MASQUER_PORT%/' -UseBasicParsing -TimeoutSec 1) | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto :launch
if %TRIES% lss 20 (
  timeout /t 1 /nobreak >nul
  goto :wait_for_port
)

:launch
start "" "http://localhost:%MASQUER_PORT%"

REM Block until the user closes the window or hits Ctrl-C. The /B'd vite
REM preview process dies with the parent console.
echo (Server running. Close this window to stop.)
pause >nul

popd
exit /b 0

:fail
echo.
echo [ERROR] Setup failed. See output above.
pause
popd
exit /b 1
