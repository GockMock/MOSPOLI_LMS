# Portable artifact manifest

Downloaded/prepared artifacts:

```text
qemu/bin/qemu-system-x86_64.exe
qemu/bin/qemu-img.exe
qemu/downloads/qemu-w64-setup-20260501.exe
qemu/downloads/qemu-w64-setup-20260501.sha512
qemu/images/noble-server-cloudimg-amd64.img
qemu/images/SHA256SUMS
qemu/images/mospli-ai.qcow2
qemu/cloud-init/user-data
qemu/cloud-init/meta-data
models/qwen3-embedding-4b-q5_k_m.gguf
```

Verified:

- QEMU installer SHA512 matches `qemu-w64-setup-20260501.sha512`.
- Ubuntu cloud image SHA256 matches `SHA256SUMS`.
- Model SHA256 recorded below.

Model SHA256:

```text
9fd05563211c2d69d74abb8769fa92983a102d11575b2517a119b0037dff217c  models/qwen3-embedding-4b-q5_k_m.gguf
```
