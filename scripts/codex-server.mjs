import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";

const PUBLIC_HOST = "127.0.0.1";
const PUBLIC_PORT = Number(process.env.CODEX_PROXY_PORT || 4500);
const INTERNAL_PORT = Number(process.env.CODEX_INTERNAL_PORT || 4501);
const APP_URL = (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
const MCP_URL = process.env.MCP_URL || `${APP_URL}/api/mcp`;

const codexProc = spawn(
  "codex",
  [
    "app-server",
    "--listen",
    `ws://${PUBLIC_HOST}:${INTERNAL_PORT}`,
    "-c",
    `mcp_servers.kakeibo.url=${MCP_URL}`,
  ],
  {
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

codexProc.on("exit", (code, signal) => {
  proxyServer.close();
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

const proxyServer = http.createServer((req, res) => {
  // Forward healthz / readyz checks to the internal app-server
  const upstreamReq = http.request(
    {
      host: PUBLIC_HOST,
      port: INTERNAL_PORT,
      path: req.url || "/",
      method: req.method,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstreamReq.on("error", () => {
    res.writeHead(503, { "content-type": "text/plain" });
    res.end("Codex App Server is starting...");
  });
  req.pipe(upstreamReq);
});

proxyServer.on("upgrade", (req, clientSocket, head) => {
  const upstream = net.connect(INTERNAL_PORT, PUBLIC_HOST, () => {
    const lines = [`${req.method || "GET"} ${req.url || "/"} HTTP/${req.httpVersion}`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const name = req.rawHeaders[i];
      const value = req.rawHeaders[i + 1];
      // Strip browser Origin header so local browser WebSocket clients are accepted
      if (name.toLowerCase() === "origin") continue;
      if (name.toLowerCase() === "host") {
        lines.push(`Host: ${PUBLIC_HOST}:${INTERNAL_PORT}`);
        continue;
      }
      lines.push(`${name}: ${value}`);
    }
    lines.push("", "");

    upstream.write(lines.join("\r\n"));
    if (head.length > 0) {
      upstream.write(head);
    }

    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });

  upstream.on("error", () => {
    clientSocket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
    clientSocket.destroy();
  });

  clientSocket.on("error", () => {
    upstream.destroy();
  });
});

proxyServer.listen(PUBLIC_PORT, PUBLIC_HOST, () => {
  console.log(
    `[codex:server] Browser-ready WebSocket proxy listening on ws://${PUBLIC_HOST}:${PUBLIC_PORT} -> ws://${PUBLIC_HOST}:${INTERNAL_PORT}`,
  );
  console.log(`[codex:server] Kakeibo MCP server configured: ${MCP_URL}`);
});

function shutdown() {
  proxyServer.close();
  codexProc.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
