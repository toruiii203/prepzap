#!/bin/sh
# Start Codex with the project-scoped 21st MCP configuration.
# Authentication comes from TWENTY_FIRST_API_KEY; never pass its value as an argument.
set -eu
CDPATH= cd -- "$(dirname -- "$0")/.."
exec codex \
  -c 'mcp_servers.magic.url="https://21st.dev/api/mcp"' \
  -c 'mcp_servers.magic.env_http_headers={"x-api-key"="TWENTY_FIRST_API_KEY"}' \
  -c 'mcp_servers.magic.required=false' \
  -c 'mcp_servers.magic.startup_timeout_sec=15' \
  "$@"
