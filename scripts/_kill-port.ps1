$c = Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
if ($c) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Killed process on port 1420"
} else {
    Write-Host "No process on port 1420"
}
