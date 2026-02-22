#!/bin/bash
# Secret Redaction Wrapper for NanoClaw Agent Containers
# Sourced before every Bash tool invocation to strip secrets from the environment.
# Each section handles one secret type — add new sections as needed.
#
# Usage: This script is sourced by the container entrypoint so that all
# child processes (including agent Bash tool calls) inherit a clean env.

# ── OpenAI / Codex API Keys ────────────────────────────────────────
unset OPENAI_API_KEY 2>/dev/null
unset CODEX_API_KEY 2>/dev/null

# ── Legacy Anthropic Keys (transition period) ──────────────────────
unset ANTHROPIC_API_KEY 2>/dev/null
unset CLAUDE_CODE_OAUTH_TOKEN 2>/dev/null

# ── Generic Cloud Provider Secrets ─────────────────────────────────
# Uncomment or add new entries as integrations are added.
# unset AWS_SECRET_ACCESS_KEY 2>/dev/null
# unset AZURE_CLIENT_SECRET 2>/dev/null
# unset GCP_SERVICE_ACCOUNT_KEY 2>/dev/null

# ── NanoClaw Internal Tokens ──────────────────────────────────────
# Add project-specific secrets here.
# unset NANOCLAW_INTERNAL_TOKEN 2>/dev/null
