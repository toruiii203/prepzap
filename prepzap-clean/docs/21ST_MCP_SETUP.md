# 21st / Magic MCP setup

The requested `npx -y @21st-dev/magic@latest` command was downloaded and executed.
The current package (0.2.3) is a compatibility proxy for the hosted **21st MCP**:

- Official migration/setup: https://github.com/21st-dev/magic-mcp
- Fresh keys and account setup: https://21st.dev/mcp
- MCP endpoint: https://21st.dev/api/mcp
- Authentication: `x-api-key`, sourced from `TWENTY_FIRST_API_KEY`.

The package reports that old Magic keys were reset. No matching credential was
present in this environment or its saved configuration when checked.

## Prepared project configuration

`.codex/config.toml` contains the remote server configuration and references the
credential by environment-variable name only. No secret value is committed.

For a Codex CLI session started inside this app, use:

```sh
./scripts/codex-magic.sh
```

The launcher supplies the same server configuration explicitly. This matters
because the managed CLI's bare `codex mcp get magic` did not discover the nested
project config automatically. It does not overwrite global Codex settings.

Configuration parsing can be checked without revealing or supplying a key:

```sh
./scripts/codex-magic.sh mcp get magic --json
```

This check passed and reported an enabled Streamable HTTP server with the
`x-api-key` environment-header mapping. It verifies configuration, not a live MCP
connection, tool discovery, account access or generation credits.

## Remaining secure setup

1. Generate a fresh key through https://21st.dev/mcp.
2. Add it securely as `TWENTY_FIRST_API_KEY` in the environment/MCP client's
   settings. Never commit it, put it in a Vite variable, or paste it into chat.
3. The cloud configuration draft now declares that secret and adds `21st.dev`
   to restricted egress. Review/save that environment configuration and publish
   the environment to activate it. The draft save alone does not apply it.
4. Reconnect/restart the MCP client. In this managed chat, a repository file cannot
   dynamically add tools to an already-running tool catalog. If the host has its
   own MCP settings, add the same URL and secure `x-api-key` header there.
5. Verify `tools/list` and account capabilities after connecting. Hosted AI
   generation is available only when enabled for the 21st account; do not assume
   a valid key includes generation access.

Do not add this developer-tool key to Cloudflare's frontend build or expose it in
browser code. The app has no runtime dependency on this MCP server or package.
