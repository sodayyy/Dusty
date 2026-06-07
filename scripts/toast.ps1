param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('done', 'stuck')]
    [string]$Type,

    [Parameter(Mandatory = $true)]
    [string]$Text
)

if ($Type -eq 'done') {
    Write-Host "[Dusty] DONE: $Text"
    # Pleasant triple ascending beep
    [Console]::Beep(800, 150)
    Start-Sleep -Milliseconds 80
    [Console]::Beep(1000, 150)
    Start-Sleep -Milliseconds 80
    [Console]::Beep(1200, 300)
}
else {
    Write-Host "[Dusty] STUCK: $Text"
    # Urgent double lower beep
    [Console]::Beep(500, 300)
    Start-Sleep -Milliseconds 150
    [Console]::Beep(500, 300)
    Start-Sleep -Milliseconds 200
    [Console]::Beep(400, 500)
}
