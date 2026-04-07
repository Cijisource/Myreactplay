# MCP Local Folder + React Frontend

This workspace contains:

- `server/`: MCP-compatible JSON-RPC server over HTTP (`/mcp`) with local folder tools
- `frontend/`: React app for browsing and reading files through MCP tool calls

## 1) Start the server

```bash
cd server
npm install
set ALLOWED_ROOT=C:\path\to\your\local\folder
npm run start
```

Server endpoint: `http://localhost:8787/mcp`

## 2) Start the frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

## Exposed Tools

- `list_directory` with argument `path`
- `read_text_file` with arguments `path`, `maxBytes`

## Notes

- All file operations are restricted under `ALLOWED_ROOT`.
- The frontend defaults to endpoint `/mcp` and uses Vite proxy to the local server.
