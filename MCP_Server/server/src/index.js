import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";

const app = express();
const port = Number(process.env.PORT || 8787);
const allowedRoot = path.resolve(process.env.ALLOWED_ROOT || process.cwd());

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/mcp", (req, res) => {
  res.json({
    ok: true,
    message: "MCP endpoint is available. Send JSON-RPC requests with HTTP POST.",
    endpoint: "/mcp",
    method: "POST"
  });
});

function getToolDefinitions() {
  return [
    {
      name: "list_directory",
      description: "List files and folders under ALLOWED_ROOT",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path under ALLOWED_ROOT" }
        },
        additionalProperties: false
      }
    },
    {
      name: "read_text_file",
      description: "Read text file content under ALLOWED_ROOT",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path under ALLOWED_ROOT" },
          maxBytes: { type: "number", description: "Maximum number of bytes to read" }
        },
        required: ["path"],
        additionalProperties: false
      }
    }
  ];
}

function makeRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function makeRpcError(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message }
  };
}

function resolveSafePath(inputPath = ".") {
  const fullPath = path.resolve(allowedRoot, inputPath);
  const normalizedRoot = allowedRoot.endsWith(path.sep) ? allowedRoot : `${allowedRoot}${path.sep}`;

  if (fullPath !== allowedRoot && !fullPath.startsWith(normalizedRoot)) {
    throw new Error("Path escapes ALLOWED_ROOT");
  }

  return fullPath;
}

async function listDirectory(relativePath = ".") {
  const fullPath = resolveSafePath(relativePath);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });

  return entries.map((entry) => ({
    name: entry.name,
    type: entry.isDirectory() ? "directory" : "file"
  }));
}

async function readTextFile(relativePath, maxBytes = 100_000) {
  if (!relativePath) {
    throw new Error("'path' is required");
  }

  const fullPath = resolveSafePath(relativePath);
  const fileBuffer = await fs.readFile(fullPath);
  const sliced = fileBuffer.slice(0, maxBytes);

  return sliced.toString("utf8");
}

app.get("/api/initialize", (req, res) => {
  res.json({
    protocolVersion: "2025-03-26",
    serverInfo: {
      name: "local-folder-server",
      version: "1.0.0"
    },
    capabilities: {
      tools: {}
    }
  });
});

app.get("/api/tools", (req, res) => {
  res.json({ tools: getToolDefinitions() });
});

app.post("/api/list-directory", async (req, res) => {
  try {
    const { path: relativePath = "." } = req.body || {};
    const entries = await listDirectory(relativePath);
    return res.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(400).json({ error: message });
  }
});

app.post("/api/read-text-file", async (req, res) => {
  try {
    const { path: relativePath, maxBytes = 100_000 } = req.body || {};
    const content = await readTextFile(relativePath, maxBytes);
    return res.json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(400).json({ error: message });
  }
});

app.post("/mcp", async (req, res) => {
  const { id = null, method, params = {} } = req.body || {};

  try {
    if (method === "initialize") {
      return res.json(
        makeRpcResult(id, {
          protocolVersion: "2025-03-26",
          serverInfo: {
            name: "local-folder-server",
            version: "1.0.0"
          },
          capabilities: {
            tools: {}
          }
        })
      );
    }

    if (method === "tools/list") {
      return res.json(
        makeRpcResult(id, {
          tools: getToolDefinitions()
        })
      );
    }

    if (method === "tools/call") {
      const { name, arguments: args = {} } = params;

      if (name === "list_directory") {
        const entries = await listDirectory(args.path || ".");
        return res.json(
          makeRpcResult(id, {
            content: [{ type: "text", text: JSON.stringify(entries, null, 2) }]
          })
        );
      }

      if (name === "read_text_file") {
        const content = await readTextFile(args.path, args.maxBytes || 100_000);
        return res.json(
          makeRpcResult(id, {
            content: [{ type: "text", text: content }]
          })
        );
      }

      return res.json(makeRpcError(id, -32601, `Unknown tool: ${name}`));
    }

    if (method === "ping") {
      return res.json(makeRpcResult(id, { ok: true }));
    }

    return res.json(makeRpcError(id, -32601, `Unknown method: ${method}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.json(makeRpcError(id, -32000, message));
  }
});

app.listen(port, () => {
  console.log(`Local Folder MCP server listening on http://localhost:${port}/mcp`);
  console.log(`ALLOWED_ROOT = ${allowedRoot}`);
});
