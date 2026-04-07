# Local Folder MCP Server

Simple MCP-compatible HTTP server for local folder access.

## Features

- `tools/list`: returns available tools
- `tools/call` for:
  - `list_directory`
  - `read_text_file`
- Path safety: all operations are restricted to `ALLOWED_ROOT`

## Run

```bash
cd server
npm install
npm run dev
```

Server URL: `http://localhost:8787/mcp`

## Config

Copy `.env.example` and set environment vars (or set them in your shell):

- `PORT` (default `8787`)
- `ALLOWED_ROOT` (default current directory)
