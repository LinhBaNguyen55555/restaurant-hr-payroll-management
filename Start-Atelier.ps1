param([switch]$FrontendOnly)
$ErrorActionPreference = 'Stop'
$projectDirectory = $PSScriptRoot
if (-not $FrontendOnly) {
    $javaDirectory = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { 'C:\Program Files\Java\jdk-27' }
    if (-not (Test-Path -LiteralPath (Join-Path $javaDirectory 'bin\java.exe'))) { throw 'Set JAVA_HOME to a JDK 27 installation.' }
    $env:JAVA_HOME = $javaDirectory
    $backendDirectory = Join-Path $projectDirectory 'backend'
    $backendProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/c', 'mvnw.cmd spring-boot:run -q' -WorkingDirectory $backendDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $backendDirectory 'server.log') -RedirectStandardError (Join-Path $backendDirectory 'server-error.log')
    Write-Host "Backend launcher PID: $($backendProcess.Id). Logs: backend/server.log"
}
Push-Location (Join-Path $projectDirectory 'frontend')
try { & npm.cmd run dev } finally { Pop-Location }
