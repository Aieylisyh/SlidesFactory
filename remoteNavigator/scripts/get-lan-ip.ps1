# Returns first usable LAN IPv4 address (one line, stdout only).
$addrs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.InterfaceAlias -notmatch 'Loopback'
    } |
    Select-Object -ExpandProperty IPAddress

if ($addrs) {
    Write-Output ($addrs | Select-Object -First 1)
}
