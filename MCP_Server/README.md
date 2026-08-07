# MCP Local Folder Console

This project is a small, local-first Model Context Protocol (MCP) demo. It combines:

- `server/`: a Node/Express server that supports both JSON-RPC and direct HTTP endpoints for read-only local folder tools.
- `frontend/`: a React/Vite web console that can call the server using either RPC or direct API transport.

The app is intended for local development and experimentation with MCP-style tool calls. It is not hardened for public internet deployment.

## Project Layout

```text
.
├── README.md
├── server/
│   ├── README.md
│   ├── package.json
│   └── src/
│       └── index.js
└── frontend/
    ├── README.md
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        └── styles.css
```

## How It Works

The frontend supports two transport modes:

- Direct API mode: calls `/api/*` endpoints.
- RPC mode: sends JSON-RPC requests to `/mcp`.

During local development, Vite proxies both `/api` and `/mcp` to the backend server at `http://localhost:8787`.

```text
React browser app
  -> transport switch (Direct API or RPC)
  -> Vite proxy
  -> Express endpoint (/api/* or /mcp)
  -> filesystem under ALLOWED_ROOT
```

The server exposes two MCP tools:

- `list_directory`: lists files and folders under the configured root.
- `read_text_file`: reads UTF-8 text content from a file under the configured root.

All filesystem access is restricted to `ALLOWED_ROOT`.

## Prerequisites

- Node.js 18 or newer
- npm
- A local folder you want the server to expose read-only

## Quick Start

Install and start the backend:

```bash
cd server
npm install
set ALLOWED_ROOT=C:\path\to\your\folder
npm run start
```

PowerShell users can set the environment variable like this:

```powershell
$env:ALLOWED_ROOT = "C:\path\to\your\folder"
npm run start
```

The server starts at:

```text
http://localhost:8787
```

In a second terminal, install and start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Typical Workflow

1. Start the server with `ALLOWED_ROOT` pointing to the folder you want to inspect.
2. Start the frontend.
3. Open the frontend in a browser.
4. Select a transport mode (Direct API or RPC), then click `Connect`.
5. Use `Browse Directory` with a relative path such as `.` or `src`.
6. Use `Read Text File` with a relative file path such as `README.md`.

## Backend Overview

The backend is implemented in `server/src/index.js`.

It provides:

- `GET /api/initialize`: direct initialization metadata.
- `GET /api/tools`: direct tool list.
- `POST /api/list-directory`: direct directory listing.
- `POST /api/read-text-file`: direct text file reading.
- `GET /mcp`: simple endpoint information.
- `POST /mcp`: JSON-RPC request handling.
- `initialize`: returns protocol metadata and server capabilities.
- `tools/list`: returns available tool definitions.
- `tools/call`: dispatches tool calls.
- `ping`: returns `{ ok: true }`.

The path safety logic lives in `resolveSafePath()`. It resolves user input against `ALLOWED_ROOT` and rejects any path that escapes that root.

## Frontend Overview

The frontend is implemented mainly in `frontend/src/App.jsx`.

It provides:

- Transport selection (Direct API or RPC).
- Endpoint/base URL configuration.
- Session initialization / connection.
- Tool listing.
- Directory browsing.
- Text file reading.
- Basic success/error status messages.

The direct API client is created by `createApiClient(baseUrl)`. RPC mode uses `createRpcClient(endpoint)`.

## Configuration

Backend environment variables:

| Name | Default | Description |
| --- | --- | --- |
| `PORT` | `8787` | Port for the Express server. |
| `ALLOWED_ROOT` | current server working directory | Root directory that file tools are allowed to access. |

Frontend development proxy:

| Path | Target |
| --- | --- |
| `/api` | `http://localhost:8787` |
| `/mcp` | `http://localhost:8787` |

The frontend default is Direct API mode with endpoint `/api`.

RPC remains available by switching transport mode to RPC and using endpoint `/mcp`.

## MCP Methods

### `initialize`

Request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "clientInfo": {
      "name": "react-folder-console",
      "version": "1.0.0"
    },
    "capabilities": {}
  }
}
```

Response includes:

- `protocolVersion`
- `serverInfo`
- `capabilities.tools`

### `tools/list`

Returns the available tool schemas.

### `tools/call`

Calls one of the exposed tools.

Example:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "list_directory",
    "arguments": {
      "path": "."
    }
  }
}
```

## Tools

### `list_directory`

Lists immediate children of a directory under `ALLOWED_ROOT`.

Arguments:

| Name | Required | Description |
| --- | --- | --- |
| `path` | No | Relative directory path. Defaults to `.`. |

Returns an MCP content item containing JSON text:

```json
[
  {
    "name": "README.md",
    "type": "file"
  },
  {
    "name": "src",
    "type": "directory"
  }
]
```

### `read_text_file`

Reads a text file under `ALLOWED_ROOT`.

Arguments:

| Name | Required | Description |
| --- | --- | --- |
| `path` | Yes | Relative file path. |
| `maxBytes` | No | Maximum number of bytes to return. Defaults to `100000`. |

Returns an MCP content item containing file text.

## Security Model

This project is designed for local use.

Important constraints:

- File operations are read-only.
- File access is restricted to `ALLOWED_ROOT`.
- Path traversal outside `ALLOWED_ROOT` is rejected.

Important limitations:

- CORS is enabled broadly.
- There is no authentication.
- There is no authorization per user or per tool.
- The server reads any file type as bytes and converts the returned slice to UTF-8.
- The frontend is a development console, not an access-controlled admin app.

Do not expose this server directly to untrusted networks without adding authentication, stricter CORS, request validation, rate limiting, and deployment hardening.

## Scripts

Server:

```bash
npm run dev
npm run start
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
```

## Troubleshooting

If the frontend cannot connect:

- Confirm the backend is running on `http://localhost:8787/mcp`.
- Confirm the frontend is running through Vite at `http://localhost:5173`.
- Keep the frontend endpoint set to `/mcp` unless you intentionally want a full URL.

If directory listing fails:

- Confirm the requested path is relative to `ALLOWED_ROOT`.
- Confirm the path is a directory.
- Confirm the server process has permission to read that directory.

If file reading fails:

- Confirm `path` is provided.
- Confirm the path points to a file, not a directory.
- Confirm the file is under `ALLOWED_ROOT`.
- Increase `maxBytes` if the visible output is truncated.

## Future Improvements

Potential next steps:

- Add tests for JSON-RPC behavior and path traversal rejection.
- Add a dedicated MCP SDK transport if strict MCP compatibility is required.
- Add authentication for non-local usage.
- Add binary-safe file metadata tools.
- Add frontend directory click navigation.
- Add structured error codes in the UI.
