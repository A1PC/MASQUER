# Creates a MASQUER shortcut on the Windows Desktop (and Start Menu) pointing
# at scripts\windows\MASQUER.bat in this checkout. Idempotent: re-running
# replaces any existing shortcut of the same name.
#
# Usage (from the repo root, in PowerShell):
#   pwsh scripts/windows/install-shortcut.ps1
#   # or, on Windows PowerShell 5.x:
#   powershell -ExecutionPolicy Bypass -File scripts\windows\install-shortcut.ps1
#
# Pass -StartMenu to also drop a shortcut in the user's Start Menu.

[CmdletBinding()]
param(
  [switch]$StartMenu
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot  = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$Launcher  = Join-Path $ScriptDir 'MASQUER.bat'

if (-not (Test-Path $Launcher)) {
  Write-Error "Launcher not found at $Launcher"
  exit 1
}

Write-Host "Installing MASQUER shortcut..." -ForegroundColor Cyan

$Desktop  = [Environment]::GetFolderPath('Desktop')
$LnkPath  = Join-Path $Desktop 'MASQUER.lnk'

# Render a .ico from public/favicon.svg if Inkscape or ImageMagick is around;
# fall back to no icon (Windows shows the default .bat icon).
$IconPath = $null
$SvgPath  = Join-Path $RepoRoot 'public\favicon.svg'

if (Test-Path $SvgPath) {
  $IcoCandidate = Join-Path $ScriptDir 'MASQUER.ico'

  if (-not (Test-Path $IcoCandidate)) {
    Write-Host "Rendering icon from public\favicon.svg..." -ForegroundColor Cyan

    $Magick = (Get-Command magick -ErrorAction SilentlyContinue).Source
    $Inkscape = (Get-Command inkscape -ErrorAction SilentlyContinue).Source

    if ($Magick) {
      # ImageMagick handles SVG → multi-size ICO in one shot
      & $Magick -background none -density 384 $SvgPath -define icon:auto-resize=16,32,48,64,128,256 $IcoCandidate 2>$null
    } elseif ($Inkscape) {
      $Tmp = New-TemporaryFile
      $TmpPng = [IO.Path]::ChangeExtension($Tmp.FullName, '.png')
      Remove-Item $Tmp -Force
      & $Inkscape $SvgPath --export-type=png --export-filename=$TmpPng --export-width=256 2>$null
      if (Test-Path $TmpPng) {
        # Bundle the single PNG as an ICO via .NET
        Add-Type -AssemblyName System.Drawing
        $Bmp = [System.Drawing.Bitmap]::FromFile($TmpPng)
        $Icon = [System.Drawing.Icon]::FromHandle($Bmp.GetHicon())
        $Stream = [System.IO.File]::Open($IcoCandidate, [System.IO.FileMode]::Create)
        $Icon.Save($Stream)
        $Stream.Close()
        $Bmp.Dispose()
        Remove-Item $TmpPng -Force
      }
    } else {
      Write-Host "  (Skipped - install ImageMagick (winget install ImageMagick.ImageMagick) or Inkscape for a brand icon)" -ForegroundColor DarkGray
    }
  }

  if (Test-Path $IcoCandidate) {
    $IconPath = $IcoCandidate
  }
}

function New-MASQUERShortcut([string]$Path) {
  if (Test-Path $Path) { Remove-Item $Path -Force }
  $WshShell = New-Object -ComObject WScript.Shell
  $Lnk = $WshShell.CreateShortcut($Path)
  $Lnk.TargetPath       = "$env:WINDIR\System32\cmd.exe"
  $Lnk.Arguments        = "/c `"$Launcher`""
  $Lnk.WorkingDirectory = $RepoRoot
  $Lnk.Description      = 'MASQUER - local play-money casino'
  $Lnk.WindowStyle      = 1
  if ($IconPath) { $Lnk.IconLocation = "$IconPath,0" }
  $Lnk.Save()
}

New-MASQUERShortcut -Path $LnkPath
Write-Host "  Installed: $LnkPath" -ForegroundColor Green

if ($StartMenu) {
  $StartDir = [Environment]::GetFolderPath('Programs')
  $StartLnk = Join-Path $StartDir 'MASQUER.lnk'
  New-MASQUERShortcut -Path $StartLnk
  Write-Host "  Installed: $StartLnk" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. Double-click MASQUER on your Desktop to launch." -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot" -ForegroundColor DarkGray
