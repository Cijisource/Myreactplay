import { useMemo, useState } from "react";

function createApiClient(baseUrl) {
  return async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    return response.json();
  };
}

function createRpcClient(endpoint) {
  let id = 1;

  return async function rpc(method, params = {}) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: id++,
        method,
        params
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (payload.error) {
      throw new Error(payload.error.message || "RPC error");
    }

    return payload.result;
  };
}

export default function App() {
  const [transport, setTransport] = useState("direct");
  const [endpoint, setEndpoint] = useState("/api");
  const [browsePath, setBrowsePath] = useState(".");
  const [filePath, setFilePath] = useState("");
  const [status, setStatus] = useState("Ready");
  const [tools, setTools] = useState([]);
  const [entries, setEntries] = useState([]);
  const [fileContent, setFileContent] = useState("");

  const request = useMemo(() => createApiClient(endpoint), [endpoint]);
  const rpc = useMemo(() => createRpcClient(endpoint), [endpoint]);

  function onTransportChange(nextTransport) {
    setTransport(nextTransport);

    if (nextTransport === "rpc" && endpoint === "/api") {
      setEndpoint("/mcp");
    }

    if (nextTransport === "direct" && endpoint === "/mcp") {
      setEndpoint("/api");
    }
  }

  async function initSession() {
    try {
      setStatus("Connecting...");

      let listedTools;
      if (transport === "rpc") {
        await rpc("initialize", {
          clientInfo: { name: "react-folder-console", version: "1.0.0" },
          capabilities: {}
        });
        listedTools = await rpc("tools/list");
      } else {
        await request("/initialize");
        listedTools = await request("/tools");
      }

      setTools(listedTools.tools || []);
      setStatus("Connected");
    } catch (error) {
      setStatus(`Init failed: ${error.message}`);
    }
  }

  async function runListDirectory() {
    try {
      setStatus("Listing directory...");

      if (transport === "rpc") {
        const result = await rpc("tools/call", {
          name: "list_directory",
          arguments: { path: browsePath }
        });
        const raw = result.content?.[0]?.text || "[]";
        setEntries(JSON.parse(raw));
      } else {
        const result = await request("/list-directory", {
          method: "POST",
          body: JSON.stringify({ path: browsePath })
        });
        setEntries(result.entries || []);
      }

      setStatus("Directory loaded");
    } catch (error) {
      setEntries([]);
      setStatus(`List failed: ${error.message}`);
    }
  }

  async function runReadFile() {
    try {
      setStatus("Reading file...");

      if (transport === "rpc") {
        const result = await rpc("tools/call", {
          name: "read_text_file",
          arguments: { path: filePath, maxBytes: 150000 }
        });
        setFileContent(result.content?.[0]?.text || "");
      } else {
        const result = await request("/read-text-file", {
          method: "POST",
          body: JSON.stringify({ path: filePath, maxBytes: 150000 })
        });
        setFileContent(result.content || "");
      }

      setStatus("File loaded");
    } catch (error) {
      setFileContent("");
      setStatus(`Read failed: ${error.message}`);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">MCP + React</p>
        <h1>Local Folder Console</h1>
        <p className="subcopy">
          Connect to your MCP server, browse files under the allowed root, and inspect text content instantly.
        </p>
      </section>

      <section className="panel">
        <label>Transport</label>
        <div className="row">
          <select value={transport} onChange={(e) => onTransportChange(e.target.value)}>
            <option value="direct">Direct API</option>
            <option value="rpc">RPC</option>
          </select>
        </div>

        <label>{transport === "rpc" ? "RPC endpoint" : "API base URL"}</label>
        <div className="row">
          <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
          <button onClick={initSession}>Connect</button>
        </div>
        <p className="status">{status}</p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Tools</h2>
          {tools.length === 0 ? (
            <p className="muted">No tools listed yet.</p>
          ) : (
            <ul className="toolList">
              {tools.map((tool) => (
                <li key={tool.name}>
                  <strong>{tool.name}</strong>
                  <span>{tool.description}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <h2>Browse Directory</h2>
          <div className="row">
            <input
              placeholder="."
              value={browsePath}
              onChange={(e) => setBrowsePath(e.target.value)}
            />
            <button onClick={runListDirectory}>List</button>
          </div>

          <ul className="entryList">
            {entries.map((entry) => (
              <li key={`${entry.type}-${entry.name}`}>
                <span className="type">{entry.type}</span>
                <span>{entry.name}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel">
        <h2>Read Text File</h2>
        <div className="row">
          <input
            placeholder="relative/path/to/file.txt"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
          />
          <button onClick={runReadFile}>Read</button>
        </div>

        <pre className="output">{fileContent || "File content will appear here."}</pre>
      </section>
    </main>
  );
}
