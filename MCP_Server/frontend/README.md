# Local Folder MCP Frontend

This package contains the React/Vite web console for the MCP Local Folder project.

The frontend lets a user:

- Select transport mode (`Direct API` or `RPC`).
- Configure an API base URL or RPC endpoint.
- Connect and initialize tool metadata.
- List tools exposed by the server.
- Browse directories under the server's `ALLOWED_ROOT`.
- Read text files under the server's `ALLOWED_ROOT`.

## Files

```text
frontend/
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── src/
    ├── App.jsx
    ├── main.jsx
    └── styles.css
```

## Runtime

- React 18
- Vite 5
- Browser `fetch()`
- Plain CSS

## Run

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Build production assets:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Development Proxy

`vite.config.js` maps frontend requests from `/api` and `/mcp` to the backend:

```js
proxy: {
  "/api": {
    target: "http://localhost:8787",
    changeOrigin: true
  },
  "/mcp": {
    target: "http://localhost:8787",
    changeOrigin: true
  }
}
```

Because of this, both transport modes work in local development.

Default UI behavior:

- Transport: `Direct API`
- Endpoint: `/api`

To use JSON-RPC, switch transport to `RPC` and use endpoint `/mcp`.

## Main Components

### `src/main.jsx`

Mounts the React application into `#root` and imports global styles.

### `src/App.jsx`

Contains the entire app UI and request logic.

Important state:

| State | Purpose |
| --- | --- |
| `transport` | Selected transport mode: direct API or RPC. |
| `endpoint` | API base URL or RPC endpoint URL. Defaults to `/api`. |
| `browsePath` | Relative directory path to list. |
| `filePath` | Relative file path to read. |
| `status` | Current UI status or error message. |
| `tools` | Tools returned by `tools/list`. |
| `entries` | Directory entries returned by `list_directory`. |
| `fileContent` | Text returned by `read_text_file`. |

Important functions:

| Function | Purpose |
| --- | --- |
| `createApiClient(baseUrl)` | Creates a direct HTTP client for `/api/*` endpoints. |
| `createRpcClient(endpoint)` | Creates a small JSON-RPC client around `fetch()`. |
| `initSession()` | In direct mode: calls `/initialize` then `/tools`; in RPC mode: calls `initialize` then `tools/list`. |
| `runListDirectory()` | In direct mode: calls `/list-directory`; in RPC mode: calls `tools/call` for `list_directory`. |
| `runReadFile()` | In direct mode: calls `/read-text-file`; in RPC mode: calls `tools/call` for `read_text_file`. |

## Transport Behavior

### Direct API Mode

The direct client sends HTTP requests to:

- `GET /api/initialize`
- `GET /api/tools`
- `POST /api/list-directory`
- `POST /api/read-text-file`

### RPC Mode

`createRpcClient(endpoint)` returns an async `rpc(method, params)` function.

Each request sends:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

The client:

1. Sends a `POST` request with `Content-Type: application/json`.
2. Throws if the HTTP response is not successful.
3. Parses the response JSON.
4. Throws if the JSON-RPC response includes `error`.
5. Returns `payload.result`.

## UI Sections

The app renders:

- A heading section describing the console.
- A transport selector and endpoint panel with a `Connect` button.
- A tools panel.
- A directory browsing panel.
- A text file reading panel.

## Styling

`src/styles.css` defines:

- Global color variables.
- Responsive layout for desktop and mobile.
- Panel/card styling.
- Input and button styles.
- Directory and tool list styles.
- Monospace output area for file content.

At widths below `860px`, the two-column grid collapses to one column and input/button rows stack vertically.

## Limitations

- No route system; the app is a single screen.
- No directory click navigation.
- No file-size progress or streaming.
- No syntax highlighting.
- No authentication UI.
- No advanced MCP session lifecycle handling.
