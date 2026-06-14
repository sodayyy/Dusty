$p = Get-Process -Name "dusty" -ErrorAction SilentlyContinue
if ($p) {
    $p | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "Killed dusty.exe"
} else {
    Write-Host "dusty.exe not running"
}
