param(
  [string]$HostName = "localhost",
  [int]$Port = 2222,
  [string]$User = "mospli",
  [string]$Key = "$PSScriptRoot\ssh\mospli_ai",
  [switch]$ForceQemu
)

$ErrorActionPreference = "Continue"

Write-Host "Requesting guest shutdown over SSH..."
ssh -i $Key -p $Port -o StrictHostKeyChecking=no -o UserKnownHostsFile="$PSScriptRoot\ssh\known_hosts" "$User@$HostName" "sudo shutdown now"

if ($ForceQemu) {
  Start-Sleep -Seconds 5
  Get-Process | Where-Object { $_.ProcessName -like "qemu-system-x86_64*" } | Stop-Process -Force
  Get-Process | Where-Object { $_.ProcessName -eq "python" -and $_.Path -like "*Python*" } | Stop-Process -Force
}
