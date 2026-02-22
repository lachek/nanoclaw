---
name: setup-atlassian-mcp
description: Configure NanoClaw to use a Docker Desktop Atlassian MCP server (Jira + Confluence) from WSL/containerized Codex sessions. Use when users say Atlassian MCP, Jira MCP, Confluence MCP, Docker MCP gateway, or ask to enable/re-enable Atlassian tools in NanoClaw.
---

# Setup Atlassian MCP

Use this workflow to connect Docker Desktop's Atlassian MCP server to NanoClaw's containerized Codex runner.

## Workflow

1. Confirm prerequisites.
2. Enable Docker MCP integration for Codex (Windows side).
3. Run Docker MCP gateway in HTTP mode.
4. Point NanoClaw Codex config to the gateway.
5. Sync per-group Codex config and restart service.
6. Verify container reachability and runtime behavior.

## 1) Confirm Prerequisites

Check these first:

```bash
docker info --format '{{.ServerVersion}} {{.OperatingSystem}}'
docker mcp version
```

Ensure Atlassian MCP has URLs and secrets configured in Docker Desktop.

Windows config files are usually under:
- `/mnt/c/Users/<windows-user>/.docker/mcp/config.yaml`
- `/mnt/c/Users/<windows-user>/.docker/mcp/registry.yaml`

## 2) Enable Codex Client Integration (Windows)

Run from PowerShell via WSL:

```bash
powershell.exe -NoProfile -Command "docker mcp client connect codex -g"
```

Note: This updates Windows Codex config and commonly uses `docker.exe mcp gateway run`.

## 3) Start Docker MCP Gateway (HTTP)

Run in Windows as a detached process:

```bash
powershell.exe -NoProfile -Command "Start-Process -WindowStyle Hidden -FilePath docker.exe -ArgumentList @('mcp','gateway','run','--servers','atlassian','--transport','streamable-http','--port','8811')"
```

Verify listener:

```bash
powershell.exe -NoProfile -Command "Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -eq 8811 } | Select-Object -First 1 LocalAddress,LocalPort"
```

## 4) Configure NanoClaw Codex to Use Gateway

Write WSL Codex config for NanoClaw runner inheritance:

```toml
model = "gpt-5.3-codex"
model_reasoning_effort = "medium"

[mcp_servers]
[mcp_servers.atlassian]
url = "http://host.docker.internal:8811/mcp"

[projects."/mnt/d/Projects/nanoclaw"]
trust_level = "trusted"
```

File to update:
- `~/.codex/config.toml`

Reason: NanoClaw copies host `~/.codex/config.toml` into per-group session profiles.

## 5) Sync Group Profiles and Restart NanoClaw

At minimum for the main group:

```bash
cp ~/.codex/config.toml data/sessions/main/.codex/config.toml
systemctl --user restart nanoclaw
systemctl --user is-active nanoclaw
```

If multiple groups exist, sync each `data/sessions/<group>/.codex/config.toml`.

## 6) Verify from Container and App Logs

Container network reachability test:

```bash
docker run --rm curlimages/curl:8.11.1 -s -o /dev/null -w '%{http_code}' http://host.docker.internal:8811/
```

Expected: `307` (redirect to `/mcp`) is healthy.

Check NanoClaw logs after a Jira/Confluence request:

```bash
tail -f logs/nanoclaw.log
```

## Troubleshooting

- `docker mcp ...` says `Docker Desktop is not running` in WSL:
  Use PowerShell (`docker.exe`) for MCP commands.

- Gateway fails with `cannot use --port with --transport=stdio`:
  Add `--transport streamable-http`.

- NanoClaw can use Docker but not Atlassian MCP:
  Ensure Codex config includes `[mcp_servers.atlassian]` URL and per-group `.codex/config.toml` is synced.

- Tools still unavailable after config changes:
  Restart service and send a fresh message to trigger a new container run.
