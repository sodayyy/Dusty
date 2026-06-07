param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('done', 'stuck')]
    [string]$Type,

    [Parameter(Mandatory = $true)]
    [string]$Text
)

$AppId = 'Dusty.Notifier'

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null

if ($Type -eq 'done') {
    $title = 'Dusty dev progress'
    $icon = [char]::ConvertFromUtf32(0x2705)
}
else {
    $title = 'Needs your attention'
    $icon = '' + [char]::ConvertFromUtf32(0x26A0) + [char]::ConvertFromUtf32(0xFE0F)
}

$fullTitle = "$icon $title"

$template = @"
<toast>
    <visual>
        <binding template="ToastGeneric">
            <text>$fullTitle</text>
            <text>$Text</text>
        </binding>
    </visual>
</toast>
"@

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = New-Object Windows.UI.Notifications.ToastNotification($xml)

try {
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($AppId).Show($toast)
}
catch {
    Write-Warning "Toast failed: $($_.Exception.Message)"
}
