# Local Folder MCP Server

This package contains the backend for the MCP Local Folder Console. It is a Node/Express server that exposes both direct HTTP endpoints and an MCP-compatible JSON-RPC endpoint over HTTP.

The server is intentionally read-only. Its tools can list directories and read text files under a configured root directory.

## Files

```text
server/
├── README.md
├── package.json
├── package-lock.json
└── src/
    └── index.js
```

## Runtime

- Node.js ESM project (`"type": "module"`)
- Express HTTP server
- JSON request body parsing with a `1mb` limit
- Broad CORS enabled through `cors()`
- Native Node filesystem APIs from `node:fs/promises`

## Configuration

| Environment variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8787` | HTTP port for the MCP endpoint. |
| `ALLOWED_ROOT` | `process.cwd()` | Root folder exposed to read-only MCP tools. |

If `ALLOWED_ROOT` is omitted, the server exposes the directory where the server process was started.

## Run

Install dependencies:

```bash
npm install
```

Start in watch mode:

```bash
npm run dev
```

Start normally:

```bash
npm run start
```

Set `ALLOWED_ROOT` on Windows Command Prompt:

```bat
set ALLOWED_ROOT=C:\path\to\your\folder
npm run start
```

Set `ALLOWED_ROOT` in PowerShell:

```powershell
$env:ALLOWED_ROOT = "C:\path\to\your\folder"
npm run start
```

Server base URL:

```text
http://localhost:8787
```

## HTTP Endpoints

### Direct API Endpoints

### `GET /api/initialize`

Returns protocol version, server info, and tool capabilities in plain JSON.

### `GET /api/tools`

Returns the available tool definitions in plain JSON.

### `POST /api/list-directory`

Lists immediate child entries for a directory under `ALLOWED_ROOT`.

Request body:

```json
{
  "path": "."
}
```

### `POST /api/read-text-file`

Reads text content from a file under `ALLOWED_ROOT`.

Request body:

```json
{
  "path": "README.md",
  "maxBytes": 150000
}
```

### MCP / JSON-RPC Endpoints

### `GET /mcp`

Returns a simple informational response confirming the MCP endpoint is available.

### `POST /mcp`

Accepts JSON-RPC requests.

Supported methods:

| Method | Description |
| --- | --- |
| `initialize` | Returns protocol version, server info, and capabilities. |
| `tools/list` | Returns available tool definitions. |
| `tools/call` | Calls a supported tool. |
| `ping` | Returns `{ ok: true }`. |

Unknown methods return JSON-RPC error code `-32601`.

Internal or validation failures return JSON-RPC error code `-32000`.

## JSON-RPC Response Helpers

`makeRpcResult(id, result)` returns:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {}
}
```

`makeRpcError(id, code, message)` returns:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Error message"
  }
}
```

## Tools

### `list_directory`

Lists immediate child entries for a directory under `ALLOWED_ROOT`.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Relative path under ALLOWED_ROOT"
    }
  },
  "additionalProperties": false
}
```

Example call:

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

Result content text contains JSON:

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

Reads a file under `ALLOWED_ROOT`, slices the result to `maxBytes`, and returns UTF-8 text.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Relative file path under ALLOWED_ROOT"
    },
    "maxBytes": {
      "type": "number",
      "description": "Maximum number of bytes to read"
    }
  },
  "required": ["path"],
  "additionalProperties": false
}
```

Example call:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "read_text_file",
    "arguments": {
      "path": "README.md",
      "maxBytes": 150000
    }
  }
}
```

## Path Safety

All requested paths pass through `resolveSafePath(inputPath)`.

That function:

1. Resolves the requested path against `ALLOWED_ROOT`.
2. Normalizes the configured root.
3. Allows the exact root path.
4. Allows descendants of the root path.
5. Rejects paths outside the root with `Path escapes ALLOWED_ROOT`.

This protects against basic path traversal attempts such as `..\\..\\secret.txt`.

## Limitations

- No authentication or authorization.
- CORS is open.
- No rate limiting.
- No write tools.
- No binary file handling.
- No MIME/type detection.
- Text decoding assumes UTF-8.
- Request schema is advertised but not strictly validated beyond current tool logic.

Use this server as a local development tool unless additional security hardening is added.
