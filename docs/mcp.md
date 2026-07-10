---
title: MCP server
description: "Expose cached tweets to agents through a secured, read-only MCP endpoint."
---

# MCP server

Birdclaw can serve its web app and a Streamable HTTP MCP endpoint from the same `birdclaw serve` process. The endpoint is `/mcp`; it is disabled until both MCP security settings are present. The production adapter also requires a loopback TCP peer, so a same-host private proxy can reach MCP but a direct LAN or internet connection to the origin cannot.

The MCP surface is intentionally smaller than the web API:

- `search_tweets` searches cached Home, Mentions, or Authored tweets; liked/bookmarked filters apply to Home
- `get_tweet_thread` reads cached ancestor and descendant context
- no DMs
- no live X calls or sync
- no post, reply, moderation, backup, filesystem, or SQL tools
- no OpenAI calls

Every tool uses Birdclaw's query-only SQLite readers. Missing tweets stay missing; MCP requests never fetch them from X.

Initialize or import Birdclaw before connecting an MCP client. The endpoint refuses a missing or outdated database instead of creating, seeding, or migrating it inside an agent request.

## Configure

Generate a dedicated secret of at least 32 bytes:

```bash
openssl rand -base64 32
```

Set the secret and the exact public MCP URL in the server environment:

```bash
export BIRDCLAW_MCP_TOKEN='replace-with-generated-secret'
export BIRDCLAW_MCP_PUBLIC_URL='https://mcp.example.com/mcp'
birdclaw serve
```

`BIRDCLAW_MCP_PUBLIC_URL` is a security boundary, not a display setting. Birdclaw requires an exact `/mcp` path, HTTPS for non-loopback hosts, an exact request Host match, and an exact Origin match when a browser supplies Origin. It does not trust forwarded-host headers.

The URL setting does not provide TLS by itself. Keep the Birdclaw listener on its default loopback address and terminate public TLS in a same-host private proxy or tunnel. Never bind the MCP origin directly to a LAN or public interface; direct non-loopback origin connections are rejected even when they spoof the configured Host.

The MCP token is independent of `BIRDCLAW_WEB_TOKEN` and is accepted only as `Authorization: Bearer …` on `/mcp`. Cookies, query parameters, and `x-birdclaw-token` do not authenticate MCP requests. All methods authenticate; only `POST` is implemented.

For local testing, HTTP is permitted only on loopback:

```bash
export BIRDCLAW_MCP_PUBLIC_URL='http://127.0.0.1:3000/mcp'
```

## Connect a client

Use a Streamable HTTP MCP client that supports bearer authentication. For Codex, add this to `config.toml`:

```toml
[mcp_servers.birdclaw]
url = "https://mcp.example.com/mcp"
bearer_token_env_var = "BIRDCLAW_MCP_TOKEN"
```

Keep the token in the client's environment or secret manager, not in a checked-in configuration file.

## Cloudflare Access

Recommended private deployment:

```text
MCP client
  -> dedicated Cloudflare Access app for mcp.example.com
  -> https://mcp.example.com/mcp
  -> the same loopback Birdclaw process used by the web UI
  -> query-only SQLite reader
```

Use a separate hostname and Access application for MCP even when it reaches the same Birdclaw listener. This gives the MCP machine credential its own audience, policy, and logs; it cannot be reused against the web app's write-capable `/api/*` routes.

For clients that support environment-backed custom headers, place Cloudflare service-token credentials in `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` and map them to `CF-Access-Client-Id` and `CF-Access-Client-Secret`. Continue sending the independent Birdclaw bearer token as well. Cloudflare Access is defense in depth; Birdclaw still fails closed if its own MCP token is missing or wrong.

Codex can map those headers without putting the values in the file:

```toml
[mcp_servers.birdclaw]
url = "https://mcp.example.com/mcp"
bearer_token_env_var = "BIRDCLAW_MCP_TOKEN"
env_http_headers = { "CF-Access-Client-Id" = "CF_ACCESS_CLIENT_ID", "CF-Access-Client-Secret" = "CF_ACCESS_CLIENT_SECRET" }
```

If a separate hostname is unavailable, use an exact `/mcp` path-scoped Access application. Do not grant an MCP service token to the entire `app.example.com` application: that outer credential could otherwise reach write-capable web routes.

Cloudflare Managed OAuth is not automatically trusted by Birdclaw. A future OAuth mode must validate the Access JWT signature, issuer, audience, and expiry at the origin before it can replace the Birdclaw bearer.

## Built-in limits

- 64 KiB request bodies, including chunked bodies
- 30-second application deadline, including slow/chunked body uploads
- 20-request burst, refilling at one request per second
- four concurrent requests per token
- JSON-RPC batches disabled; each request is charged separately
- 100 search results maximum
- 80 thread tweets maximum
- 500 query characters and 32 FTS-tokenized query terms
- scoped searches matching more than 1,000 cached tweets rejected
- 2 MiB tool-result limit
- stateless JSON responses; no sessions or SSE listener
- `Cache-Control: no-store` on every response

Use the reverse proxy for an end-to-end request timeout, additional IP/account rate limits, request logging, and TLS. The application deadline cannot preempt synchronous SQLite execution, so the broad-search and bounded-thread guards are also enforced. Never log authorization headers, request bodies, search text, or tweet content.

## Rotate or disable

Rotate access by replacing `BIRDCLAW_MCP_TOKEN` in the server and client environments, then restarting both. Disable MCP by removing either `BIRDCLAW_MCP_TOKEN` or `BIRDCLAW_MCP_PUBLIC_URL`; `/mcp` then fails closed with `503`.
