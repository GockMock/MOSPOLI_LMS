# Generic VM Deploy

Use this for a normal Ubuntu VM/VPS where Docker Engine can run directly.

## 1. Install Docker

```bash
sudo bash deploy/vm/install-docker.sh
```

## 2. Deploy AI compose

From repo root on the VM:

```bash
bash deploy/vm/deploy-ai-compose.sh
```

Optional env:

```bash
AI_PUBLIC_HOST=1.2.3.4 bash deploy/vm/deploy-ai-compose.sh
```

The script writes:

```text
ai-navigation-upstream.env
```

Example output:

```env
AI_NAVIGATION_UPSTREAM=http://1.2.3.4:3001
VITE_AI_NAVIGATION_URL=
```

Copy `AI_NAVIGATION_UPSTREAM` into the LMS site server/nginx environment, not into browser-facing code.

## 3. Verify

```bash
AI_NAVIGATION_UPSTREAM=http://1.2.3.4:3001 bash deploy/vm/verify-ai.sh
```

## Production communication

Frontend calls:

```text
/api/navigation-search
```

LMS server nginx proxies to:

```text
$AI_NAVIGATION_UPSTREAM/api/navigation-search
```

See `deploy/nginx/mospoli-lms-ai-proxy.conf`.
