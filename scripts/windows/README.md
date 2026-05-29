# Windows desktop launcher

A one-time installer that drops a double-clickable **MASQUER** shortcut on
your Desktop. The shortcut builds and serves the production bundle, then
opens it in your browser.

## Requirements

- Windows 10 or 11
- [Node.js 20+](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation) — pick one:
  - `winget install pnpm.pnpm`
  - `npm install -g pnpm`
  - `irm https://get.pnpm.io/install.ps1 | iex`

Optional (for a brand icon on the shortcut):

- [ImageMagick](https://imagemagick.org/) (recommended) — `winget install ImageMagick.ImageMagick`
- OR [Inkscape](https://inkscape.org/) — `winget install Inkscape.Inkscape`

If neither is installed the shortcut still works, you just get the default
icon.

## Install (one-time)

From the repo root, in PowerShell:

```powershell
pwsh scripts/windows/install-shortcut.ps1
```

Or on Windows PowerShell 5.x:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\windows\install-shortcut.ps1
```

Add `-StartMenu` to also drop a Start-Menu entry:

```powershell
pwsh scripts/windows/install-shortcut.ps1 -StartMenu
```

## Use

- **Double-click** the MASQUER shortcut on your Desktop.
- A Command Prompt window shows install / build progress (first run only),
  then starts the server and opens your default browser to
  `http://localhost:4173`.
- **Close the Command Prompt window** to stop the server.

## How it works

- The Desktop shortcut targets `cmd.exe /c "...\scripts\windows\MASQUER.bat"`
  with the working directory set to the repo root.
- The `.bat` launcher:
  1. Locates `pnpm` (handles `%LOCALAPPDATA%\pnpm`, `%APPDATA%\npm`, winget
     links, Node.js install dir).
  2. Runs `pnpm install` if `node_modules\` is missing.
  3. Runs `pnpm build` if `dist\` is missing **or** the newest file under
     `src\` is newer than `dist\` (PowerShell `LastWriteTime.Ticks` compare).
  4. Starts `pnpm exec vite preview --port 4173 --host 127.0.0.1 --strictPort`
     in the same console window.
  5. Polls the port until it binds, then opens
     [http://localhost:4173](http://localhost:4173) in your default browser.
  6. Blocks on `pause` so closing the window also kills the server.
- The `.ico` icon is generated at install time from `public/favicon.svg`
  using either ImageMagick (preferred — produces a multi-resolution ICO) or
  Inkscape (fallback — single-resolution 256×256 ICO bundled via .NET
  `System.Drawing.Icon.FromHandle`).

## Re-run when you move the repo

The Desktop shortcut hard-codes the absolute path to this checkout. If you
move/rename the repo directory, re-run the installer:

```powershell
pwsh scripts/windows/install-shortcut.ps1
```

## Custom port

```powershell
$env:MASQUER_PORT = '8080'
.\scripts\windows\MASQUER.bat
```

`MASQUER_PORT` from the environment overrides the default 4173.

## Uninstall

```powershell
Remove-Item "$env:USERPROFILE\Desktop\MASQUER.lnk" -Force
Remove-Item ([Environment]::GetFolderPath('Programs') + '\MASQUER.lnk') -ErrorAction SilentlyContinue
```

The repo is untouched.
