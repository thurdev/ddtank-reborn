#!/usr/bin/env node
// Minimal stand-in for apps/api so the launcher can be exercised alone:
//   GET  /api/public/launcher  -> manifest
//   POST /api/auth/login       -> flashvars (any user, password "123")
// Usage: node scripts/mock-api.mjs [port=8080]
import http from "node:http";
import { randomBytes } from "node:crypto";

const port = Number(process.argv[2] ?? process.env.PORT ?? 8080);
const base = `http://localhost:${port}`;
const manifest = {
  launcher: { latestVersion: "0.1.0", minVersion: "0.0.0", downloadUrl: `${base}/launcher/` },
  defaultRuntime: "projector",
  client: { swfUrl: `${base}/flash/Loading.swf`, configUrl: `${base}/flash/config.xml`, width: 1000, height: 600 },
  servers: [
    { id: "s1", name: "Servidor 1 — Clássico", status: "online", players: 12, recommended: true },
    { id: "s2", name: "Servidor 2 — PvE", status: "maintenance", description: "Volta às 20h" },
  ],
  news: [
    { id: "1", title: "Bem-vindo ao DDTank Reborn", body: "Servidor de testes no ar.", date: new Date().toISOString(), tag: "Novidade" },
  ],
};

http
  .createServer((req, res) => {
    const json = (code, body) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.method === "GET" && req.url === "/api/public/launcher") return json(200, manifest);
    if (req.method === "POST" && req.url === "/api/auth/login") {
      let b = "";
      req.on("data", (c) => (b += c));
      req.on("end", () => {
        const { username, password } = JSON.parse(b || "{}");
        if (password !== "123") return json(401, { message: "Usuário ou senha incorretos." });
        json(200, {
          user: { id: 1, username },
          play: { flashvars: { user: username, key: randomBytes(16).toString("hex"), config: manifest.client.configUrl } },
        });
      });
      return;
    }
    json(404, { message: "not found" });
  })
  .listen(port, () => console.log(`mock api on ${base}`));
