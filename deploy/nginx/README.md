# Nginx AI Proxy

Use this when the LMS site and AI infrastructure are deployed separately.

Browser requests stay same-origin:

```text
https://lms.example.com/api/navigation-search
```

Nginx forwards them to the AI service:

```text
http://AI_VM_OR_VAST_IP:3001/api/navigation-search
```

Frontend env can stay empty:

```env
VITE_AI_NAVIGATION_URL=
```

Server-side/proxy env or config should point to AI:

```env
AI_NAVIGATION_UPSTREAM=http://AI_VM_OR_VAST_IP:3001
```

For local Vite development, `.env.local` uses:

```env
AI_NAVIGATION_UPSTREAM=http://localhost:3001
VITE_AI_NAVIGATION_URL=
```
