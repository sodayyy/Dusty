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
}
else {
    $title = 'Needs your attention'
}

$escapedTitle = [System.Security.SecurityElement]::Escape($title)
$escapedText  = [System.Security.SecurityElement]::Escape($Text)

$template = @"
<toast>
    <visual>
        <binding template="ToastGeneric">
            <text>${escapedTitle}</text>
            <text>${escapedText}</text>
        </binding>
    </visual>
</toast>
"@

try {
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($template)
    $toast = New-Object Windows.UI.Notifications.ToastNotification($xml)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($AppId).Show($toast)
    Write-Host "Toast sent: $Type - $Text"
}
catch {
    Write-Host "Toast FAILED: $($_.Exception.Message)"
}
