import { useMemo, useState } from "react";

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
  const [endpoint, setEndpoint] = useState("/mcp");
  const [browsePath, setBrowsePath] = useState(".");
  const [filePath, setFilePath] = useState("");
  const [status, setStatus] = useState("Ready");
  const [tools, setTools] = useState([]);
  const [entries, setEntries] = useState([]);
  const [fileContent, setFileContent] = useState("");

  const rpc = useMemo(() => createRpcClient(endpoint), [endpoint]);

  async function initSession() {
    try {
      setStatus("Initializing MCP session...");
      await rpc("initialize", {
        clientInfo: { name: "react-folder-console", version: "1.0.0" },
        capabilities: {}
      });

      const listedTools = await rpc("tools/list");
      setTools(listedTools.tools || []);
      setStatus("Connected");
    } catch (error) {
      setStatus(`Init failed: ${error.message}`);
    }
  }

  async function runListDirectory() {
    try {
      setStatus("Listing directory...");
      const result = await rpc("tools/call", {
        name: "list_directory",
        arguments: { path: browsePath }
      });

      const raw = result.content?.[0]?.text || "[]";
      setEntries(JSON.parse(raw));
      setStatus("Directory loaded");
    } catch (error) {
      setEntries([]);
      setStatus(`List failed: ${error.message}`);
    }
  }

  async function runReadFile() {
    try {
      setStatus("Reading file...");
      const result = await rpc("tools/call", {
        name: "read_text_file",
        arguments: { path: filePath, maxBytes: 150000 }
      });

      setFileContent(result.content?.[0]?.text || "");
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
        <label>MCP endpoint</label>
        <div className="row">
          <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
          <button onClick={initSession}>Initialize</button>
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
