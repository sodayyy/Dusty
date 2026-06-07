Get-Process -Name "dusty" -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force; Write-Host "Killed dusty.exe PID $($_.Id)" }

$conns = Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($ownerPid in $conns) {
    try { Stop-Process -Id $ownerPid -Force; Write-Host "Killed PID $ownerPid on port 1420" } catch {}
}
