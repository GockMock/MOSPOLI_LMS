param(
  [string]$QemuExe = "$PSScriptRoot\bin\qemu-system-x86_64.exe",
  [string]$Disk = "$PSScriptRoot\images\mospli-ai.qcow2",
  [int]$MemoryMb = 8192,
  [int]$Cpus = 4,
  [string]$Cpu = "qemu64",
  [int]$CloudInitPort = 8000,
  [switch]$NoWhpx,
  [switch]$NoCloudInitServer
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $QemuExe)) {
  throw "QEMU executable not found: $QemuExe. Expected portable QEMU under qemu/bin."
}

if (!(Test-Path $Disk)) {
  throw "VM disk not found: $Disk. Expected qemu/images/mospli-ai.qcow2."
}

$seedDir = Join-Path $PSScriptRoot "cloud-init"
$seedProcess = $null

if (!$NoCloudInitServer) {
  if (!(Test-Path (Join-Path $seedDir "user-data")) -or !(Test-Path (Join-Path $seedDir "meta-data"))) {
    throw "cloud-init files are missing in $seedDir"
  }

  Write-Host "Starting cloud-init seed server on http://127.0.0.1:$CloudInitPort/"
  $seedProcess = Start-Process -FilePath "python" -ArgumentList @("-m", "http.server", "$CloudInitPort", "--bind", "0.0.0.0") -WorkingDirectory $seedDir -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 1
}

$shared = Join-Path $PSScriptRoot "shared"
New-Item -ItemType Directory -Force $shared | Out-Null

$accel = if ($NoWhpx) { @("-accel", "tcg") } else { @("-accel", "whpx,kernel-irqchip=off") }
$seedSerial = "ds=nocloud-net;s=http://10.0.2.2:$CloudInitPort/"

$args = @(
  "-m", $MemoryMb,
  "-smp", $Cpus,
  @($accel),
  "-cpu", $Cpu,
  "-drive", "file=$Disk,format=qcow2,if=virtio",
  "-netdev", "user,id=net0,hostfwd=tcp::2222-:22,hostfwd=tcp::3001-:3001,hostfwd=tcp::8080-:8080",
  "-device", "virtio-net-pci,netdev=net0",
  "-smbios", "type=1,serial=$seedSerial",
  "-display", "none",
  "-serial", "mon:stdio"
).ForEach({ $_ })

try {
  Write-Host "Starting MOSPOLI portable AI VM..."
  Write-Host "SSH after cloud-init: ssh -p 2222 mospli@localhost  (password: mospli)"
  Write-Host "AI API after compose: http://localhost:3001"
  Write-Host "Cloud-init seed: $seedSerial"
  & $QemuExe @args
}
finally {
  if ($seedProcess -and -not $seedProcess.HasExited) {
    Stop-Process -Id $seedProcess.Id -Force
  }
}
