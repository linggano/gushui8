param(
    [Parameter(Mandatory = $false, Position = 0, ValueFromPipeline = $true)]
    [string[]]$Files,

    [Parameter(Mandatory = $false)]
    [string]$Author,

    [Parameter(Mandatory = $false)]
    [string]$Email,

    [Parameter(Mandatory = $false)]
    [string]$Type = "module",

    [Parameter(Mandatory = $false)]
    [ValidateSet("jsdoc", "divider", "hash")]
    [string]$Style = "auto",

    [Parameter(Mandatory = $false)]
    [switch]$Force,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun
)

function Find-ProjectRoot {
    $dir = $PWD.Path
    while ($dir) {
        if ((Test-Path (Join-Path $dir "package.json")) -or (Test-Path (Join-Path $dir ".git"))) {
            return $dir
        }
        $parent = Split-Path $dir -Parent
        if ($parent -eq $dir) { break }
        $dir = $parent
    }
    return $PWD.Path
}

function Get-RelPath {
    param([string]$FullPath, [string]$Root)
    $fullUri = [System.Uri]::new(($FullPath -replace '\\', '/'))
    $rootUri = [System.Uri]::new(($Root -replace '\\', '/'))
    return [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($fullUri).ToString())
}

function Get-HeaderStyle {
    param([string]$Ext, [string]$Preferred)
    if ($Preferred -ne "auto") { return $Preferred }

    $ext = $Ext.ToLower()
    $jsdocExt = @(".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx", ".java", ".cs", ".go", ".php", ".rb")
    $dividerExt = @(".css", ".scss", ".less", ".html", ".xml", ".sql", ".c", ".h", ".cpp", ".hpp")

    if ($jsdocExt -contains $ext) { return "jsdoc" }
    if ($dividerExt -contains $ext) { return "divider" }
    return "hash"
}

function Get-HeaderTemplate {
    param([string]$Style)
    switch ($Style) {
        "jsdoc" {
            return @(
                "/**",
                " * @file   {0}",
                " * @path   {1}",
                " * @type   {2}",
                " * @author {3}",
                " * @email  {4}",
                " * @date   {5}",
                " */"
            )
        }
        "divider" {
            return @(
                "/* =============================================================",
                " * File  : {0}",
                " * Path  : {1}",
                " * Type  : {2}",
                " * Author: {3}",
                " * Email : {4}",
                " * Date  : {5}",
                " * ============================================================ */"
            )
        }
        "hash" {
            return @(
                "# =============================================================",
                "# File  : {0}",
                "# Path  : {1}",
                "# Type  : {2}",
                "# Author: {3}",
                "# Email : {4}",
                "# Date  : {5}",
                "# ============================================================="
            )
        }
    }
}

function Test-HasHeader {
    param([string]$Content)
    return $Content -match '(?s)^\s*(/\*\*|/\*|#)\s*\r?\n\s*\*\s*(@file|File)'
}

if (-not $Files) {
    Write-Host "Usage: .\scripts\add-header.ps1 <file> [-Author Name] [-Email mail] [-Style jsdoc|divider|hash] [-Force] [-DryRun]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\scripts\add-header.ps1 app.js" -ForegroundColor Gray
    Write-Host "  .\scripts\add-header.ps1 src\*.js -Style jsdoc -Author 'Zhang' -Email 'zhang@example.com'" -ForegroundColor Gray
    Write-Host "  Get-ChildItem -Recurse -Filter *.js | .\scripts\add-header.ps1" -ForegroundColor Gray
    exit 0
}

$projectRoot = Find-ProjectRoot
$date = Get-Date -Format "yyyy-MM-dd"

if (-not $Author -or -not $Email) {
    $pkgJsonPath = Join-Path $projectRoot "package.json"
    if (Test-Path $pkgJsonPath) {
        try {
            $pkg = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
            if (-not $Author) { $Author = if ($pkg.author) { $pkg.author } else { "Your Name" } }
            if (-not $Email) {
                if ($pkg.author -is [PSObject] -and $pkg.author.email) {
                    $Email = $pkg.author.email
                } else {
                    $Email = "linggano@hotmail.com"
                }
            }
        } catch {
            $Author = "linggano"
            $Email = "linggano@hotmail.com"
        }
    }
}

$processed = 0
$skipped = 0
$errors = 0

foreach ($file in $Files) {
    foreach ($resolved in (Resolve-Path $file -ErrorAction SilentlyContinue)) {
        $fullPath = $resolved.Path
        $relPath = Get-RelPath -FullPath $fullPath -Root $projectRoot
        $fileName = Split-Path $fullPath -Leaf
        $ext = [System.IO.Path]::GetExtension($fileName)
        $headerStyle = Get-HeaderStyle -Ext $ext -Preferred $Style
        $template = Get-HeaderTemplate -Style $headerStyle

        try {
            $content = Get-Content $fullPath -Raw -Encoding UTF8
        } catch {
            Write-Host "[ERR] Cannot read $relPath : $_" -ForegroundColor Red
            $errors++
            continue
        }

        if ((Test-HasHeader -Content $content) -and -not $Force) {
            Write-Host "[SKIP] $relPath (already has header, use -Force to overwrite)" -ForegroundColor DarkGray
            $skipped++
            continue
        }

        $nl = [Environment]::NewLine
        $header = ($template | ForEach-Object { $_ -f $fileName, $relPath, $Type, $Author, $Email, $date }) -join $nl
        $newContent = "$header$nl$nl$content"

        if ($DryRun) {
            Write-Host "[DRY] Would insert header into $relPath :" -ForegroundColor Yellow
            $header -split $nl | ForEach-Object { Write-Host $_ }
            Write-Host ""
        } else {
            try {
                $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
                [System.IO.File]::WriteAllText($fullPath, $newContent, $utf8NoBom)
                Write-Host "[OK] $relPath  ($headerStyle)" -ForegroundColor Green
                $processed++
            } catch {
                Write-Host "[ERR] Failed to write $relPath : $_" -ForegroundColor Red
                $errors++
            }
        }
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "Project Root : $projectRoot"
Write-Host "Processed    : $processed" -ForegroundColor Green
Write-Host "Skipped      : $skipped" -ForegroundColor DarkGray
Write-Host "Errors       : $errors" -ForegroundColor Red