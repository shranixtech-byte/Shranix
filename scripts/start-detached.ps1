# Launch dev servers in a fully independent hidden PowerShell window so no
# parent-shell teardown (basher timeout / console close) can kill them.
# NOTE: the Node-based start-detached.mjs was removed — on Windows its detached
# spawn still shares the console and dies with STATUS_CONTROL_C_EXIT. This
# PowerShell Start-Process variant is the reliable launcher.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path   # scripts/
$proj = Split-Path -Parent $root                          # project root
$log = Join-Path $root ".dev-servers-detached.log"
Start-Process -FilePath "node" -ArgumentList "scripts/dev.mjs" -WorkingDirectory $proj -RedirectStandardOutput $log -RedirectStandardError "$log.err" -WindowStyle Hidden
Write-Output "Started dev servers in independent process (log: $log)"
