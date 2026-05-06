# Portable QEMU AI VM

This folder contains project-local scripts for running the MOSPOLI_LMS AI navigation stack inside a portable Linux VM.

The host does not need Docker Desktop. Docker runs inside the Linux VM.

## Folder layout

```text
qemu/
├── images/              # place VM qcow2 disk here
├── shared/              # optional host/guest shared folder
├── scripts/             # guest-side helper scripts
├── ssh/                 # host-side SSH helper
├── start-vm.ps1         # start QEMU VM
└── README.md
```

## Requirements on Windows host

1. QEMU for Windows available in `PATH`, or pass `-QemuExe` to `start-vm.ps1`.
2. CPU virtualization enabled in BIOS/UEFI.
3. Windows Hypervisor Platform enabled for WHPX acceleration.
4. A Linux qcow2 disk image at:

```text
qemu/images/mospli-ai.qcow2
```

Recommended guest: Ubuntu Server LTS cloud or manually installed Ubuntu Server.

## Start VM

```powershell
.\qemu\start-vm.ps1
```

If WHPX is unavailable, use slower TCG fallback:

```powershell
.\qemu\start-vm.ps1 -NoWhpx
```

Forwarded ports:

```text
host localhost:2222 -> guest :22
host localhost:3001 -> guest :3001
host localhost:8080 -> guest :8080
```

## SSH into VM

```powershell
ssh -p 2222 mospli@localhost
```

or:

```powershell
.\qemu\ssh\connect.ps1 -User mospli
```

The actual username depends on how the Linux image was created.

## Install Docker inside VM

Copy or mount this repository into the VM, then run:

```bash
sudo bash qemu/scripts/install-docker-ubuntu.sh
```

Verify:

```bash
bash qemu/scripts/verify-docker.sh
```

Expected commands to pass:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

## Model placement

Place the Q5_K_M embedding model on the VM/project path:

```text
models/qwen3-embedding-4b-q5_k_m.gguf
```

Required quantization:

```text
Q5_K_M
```

Preferred family:

```text
Qwen3-Embedding-4B GGUF Q5_K_M
```

## Start AI stack inside VM

From the project root inside the VM:

```bash
docker compose -f docker-compose.ai.yml up --build
```

Mock mode without llama.cpp/model for API development:

```bash
docker compose -f docker-compose.ai.mock.yml up --build
```

## Test from Windows host

```powershell
curl http://localhost:3001/health
```

```powershell
curl -X POST http://localhost:3001/api/navigation-search `
  -H "Content-Type: application/json" `
  -d '{"query":"войти","locale":"ru"}'
```

## Stop VM safely

Use the project helper:

```powershell
.\qemu\stop-vm.ps1
```

## Known limitations

- WHPX accelerates CPU virtualization only.
- GPU passthrough from Windows host into QEMU Linux is not part of MVP and is usually much harder than CPU mode.
- The AI stack is CPU-first; this matches the MVP requirement.
- The VM disk image is not committed to git by default and should be managed as a local artifact.

## Downloaded portable artifacts

Current local portable artifacts were prepared under `qemu/` and `models/`:

```text
qemu/bin/                              # extracted portable QEMU for Windows
qemu/images/mospli-ai.qcow2            # resized Ubuntu VM disk, 30 GiB virtual
qemu/images/noble-server-cloudimg-amd64.img
qemu/cloud-init/user-data              # creates user mospli
qemu/cloud-init/meta-data
models/qwen3-embedding-4b-q5_k_m.gguf  # Qwen3 Embedding 4B Q5_K_M
```

The private SSH key `qemu/ssh/mospli_ai` is local-only and ignored by git.

The default VM CPU profile is `qemu64` because `-cpu max` caused WHPX APX/MPX exit issues on this host. WHPX acceleration is still used by default; pass `-NoWhpx` only as a fallback.

First SSH after boot:

```powershell
.\qemu\ssh\connect.ps1 -User mospli
```

Default password, if key auth is unavailable:

```text
mospli
```

Real stack verified from Windows host through forwarded ports:

```powershell
curl http://localhost:3001/health
```

The verified real stack uses `embedding_mock=false` and `models/qwen3-embedding-4b-q5_k_m.gguf` via `llama.cpp`.


