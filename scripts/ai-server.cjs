const fs = require("fs");
const http = require("http");
const path = require("path");
const handler = require("../api/ai-assist.js");

function loadEnv() {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) {
    return;
  }
  fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.charAt(0) === "#") {
        return;
      }
      const eq = trimmed.indexOf("=");
      if (eq < 1) {
        return;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') ||
        (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
}

loadEnv();

const port = Number(process.env.AI_ASSIST_PORT || 5510);
const server = http.createServer(function (req, res) {
  const url = req.url || "";
  if (url === "/api/ai-assist" || url.indexOf("/api/ai-assist?") === 0) {
    handler(req, res);
    return;
  }
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("not found");
});

server.listen(port, "127.0.0.1", function () {
  console.log("SELVERE AI assist listening on http://127.0.0.1:" + port + "/api/ai-assist");
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is missing. Add it to .env.local before using the AI button.");
  }
});
