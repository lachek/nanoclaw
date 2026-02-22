---
name: setup-windows
description: Set up NanoClaw on Windows via WSL2 + Docker Desktop. Use when user asks for Windows setup, WSL2 setup, or Docker Desktop integration. Triggers on "setup windows", "setup-windows", "wsl setup", or "windows wsl docker".
---

# NanoClaw Setup (Windows via WSL2 + Docker Desktop)

This skill sets up NanoClaw for Windows users who run NanoClaw **inside WSL2** and run containers through **Docker Desktop WSL integration**.

## Scope

- Supported: WSL2 distro terminal (Ubuntu/Debian/etc.) + Docker Desktop on Windows
- Not supported: native Windows Node.js runtime (PowerShell/cmd without WSL)

## 1. Confirm environment

Run:

```bash
./.codex/skills/setup/scripts/01-check-environment.sh
```

Interpret results:
- `PLATFORM` should be `wsl`
- If not in WSL, tell the user to open their WSL distro terminal and re-run this skill.

## 2. Install Node.js (if needed)

If `NODE_OK=false`, offer install:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs
```

Then re-run step 1.

## 3. Install dependencies

Run:

```bash
./.codex/skills/setup/scripts/02-install-deps.sh
```

If it fails, diagnose from `logs/setup.log`, fix, and retry.

## 4. Validate Docker Desktop + WSL integration

Docker is required. In WSL:
- `docker info` must succeed

If Docker is not available:
1. Ensure Docker Desktop is installed on Windows: https://docker.com/products/docker-desktop
2. Start Docker Desktop on Windows
3. In Docker Desktop, enable **Settings → Resources → WSL Integration** for this distro
4. Re-run `docker info` in WSL

Then run:

```bash
./.codex/skills/setup/scripts/03-setup-container.sh --runtime docker
```

## 5. Configure credentials, WhatsApp auth, channel, mounts

Reuse the same flow as `/setup`:
- Credentials in `.env` (`OPENAI_API_KEY` or `CODEX_API_KEY`)
- WhatsApp auth via `04-auth-whatsapp.sh`
- Group sync/register via `05*` and `06`
- Mount allowlist via `07-configure-mounts.sh`

## 6. Service mode (WSL)

Run:

```bash
./.codex/skills/setup/scripts/08-setup-service.sh --platform wsl
```

Interpret result:
- `SERVICE_TYPE=systemd`: service is configured under `systemctl --user`
- `SERVICE_TYPE=manual`: this is expected on WSL without systemd

For manual mode, run NanoClaw with:

```bash
npm run build && node dist/index.js
```

Keep that terminal open.

## 7. Verify

Run:

```bash
./.codex/skills/setup/scripts/09-verify.sh
```

In WSL manual mode, `SERVICE=manual` is valid.

## 8. Final test + logs

- Send a test message in the registered chat
- Watch logs:

```bash
tail -f logs/nanoclaw.log
```

If manual mode is used, remind the user NanoClaw runs only while their terminal process is alive.
