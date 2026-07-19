import { createHmac } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("./web", import.meta.url)));
const mockRoot = resolve(fileURLToPath(new URL("./mock-data", import.meta.url)));
const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const envPaths = [resolve(projectRoot, "../.env"), resolve(projectRoot, "../../Race Media Command Centre Voice Agent/.env"), resolve(projectRoot, ".env")];
const port = Number(process.env.RMCC_WEB_PORT || 8790);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function loadEnv() {
  const env = {};
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      env[key.trim()] = rest.join("=").trim();
    }
  }
  return env;
}

function required(env, key) {
  if (!env[key]) throw new Error(`Missing required environment value: ${key}`);
  return env[key];
}

function readMockJson(name) {
  const path = resolve(mockRoot, name);
  if (!path.startsWith(mockRoot) || !existsSync(path)) return [];
  const contents = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(contents);
}

function currency(value) {
  return `£${Number(value).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function buildMockSnapshot() {
  const projects = readMockJson("projects.json");
  const tasks = readMockJson("tasks.json");
  const money = readMockJson("money.json");
  const ideas = readMockJson("ideas.json");
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const projectName = (projectId) => projectById.get(projectId)?.name || projectId;
  const activeProjects = projects
    .filter((project) => project.status === "active")
    .map((project) => ({
      id: project.id,
      name: project.name,
      priority: project.priority,
      lastUpdatedDaysAgo: project.lastUpdatedDaysAgo,
      summary: project.summary,
      notes: project.notes || []
    }));
  const staleProjects = activeProjects
    .filter((project) => project.lastUpdatedDaysAgo >= 10)
    .map((project) => ({
      id: project.id,
      name: project.name,
      lastUpdatedDaysAgo: project.lastUpdatedDaysAgo,
      reason: `${project.lastUpdatedDaysAgo} days since the last update`
    }));
  const overdueTasks = tasks
    .filter((task) => task.overdue)
    .map((task) => ({ id: task.id, project: projectName(task.projectId), title: task.title, due: task.due }));
  const moneyItems = money.map((item) => ({
    id: item.id,
    client: item.client,
    project: projectName(item.projectId),
    amount: item.amount,
    formattedAmount: currency(item.amount),
    due: item.due
  }));
  const outstandingTotal = moneyItems.reduce((total, item) => total + item.amount, 0);

  return {
    mode: "mock",
    focus: {
      primary: "Collect outstanding money and unblock Queen Bee.",
      reasons: [`${currency(outstandingTotal)} is outstanding`, `${overdueTasks.length} overdue tasks need attention`, `${staleProjects.length} active projects are going stale`],
      nextSteps: ["Chase Acme Fitness before opening another new front.", "Approve the Queen Bee hero direction.", "Finish the safe RMCC API action whitelist."]
    },
    totals: { activeProjects: activeProjects.length, staleProjects: staleProjects.length, overdueTasks: overdueTasks.length, outstandingMoney: outstandingTotal, formattedOutstandingMoney: currency(outstandingTotal) },
    activeProjects,
    staleProjects,
    overdueTasks,
    outstandingMoney: { total: outstandingTotal, formattedTotal: currency(outstandingTotal), items: moneyItems },
    ideas
  };
}

function rmccConfigured(env) {
  return Boolean((env.RMCC_MCP_URL || env.RMCC_API_BASE_URL) && (env.RMCC_MCP_TOKEN || env.RMCC_API_TOKEN));
}

async function callRmccTool(env, name, argumentsValue = {}) {
  const response = await fetch(env.RMCC_MCP_URL || env.RMCC_API_BASE_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${env.RMCC_MCP_TOKEN || env.RMCC_API_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: argumentsValue } })
  });
  if (!response.ok) throw new Error(`RMCC MCP returned HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || "RMCC MCP tool call failed");
  const text = body.result?.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("RMCC MCP returned no tool content");
  return JSON.parse(text);
}

async function buildRemoteSnapshot(env) {
  const data = await callRmccTool(env, "get_focus_summary");
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const metrics = new Map((Array.isArray(data.metrics) ? data.metrics : []).map((item) => [item.project_id, item]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const today = new Date().toISOString().slice(0, 10);
  const activeProjects = projects.filter((project) => project.status === "active");
  const staleProjects = activeProjects
    .filter((project) => (metrics.get(project.id)?.days_since_last_worked || 0) >= 10)
    .map((project) => ({
      id: project.id,
      name: project.name,
      lastUpdatedDaysAgo: metrics.get(project.id)?.days_since_last_worked,
      reason: `${metrics.get(project.id)?.days_since_last_worked} days since the last update`
    }));
  const overdueTasks = tasks
    .filter((task) => task.status !== "complete" && task.due_date && task.due_date < today)
    .map((task) => ({ id: task.id, project: projectById.get(task.project_id)?.name || task.project_id, title: task.title, due: task.due_date }));
  const moneyItems = projects
    .map((project) => {
      const amount = metrics.get(project.id)?.outstanding_balance ?? ((project.amount_charged || 0) - (project.amount_paid || 0));
      return { project, amount };
    })
    .filter(({ project, amount }) => ["invoiced", "part_paid", "overdue"].includes(project.payment_status) && amount > 0)
    .map(({ project, amount }) => ({
      id: project.id,
      client: project.name,
      project: project.name,
      amount,
      formattedAmount: currency(amount),
      due: project.payment_due_date || "date not set"
    }));
  const outstandingTotal = moneyItems.reduce((total, item) => total + item.amount, 0);
  const nextSteps = [
    ...overdueTasks.slice(0, 2).map((task) => `Resolve overdue task: ${task.title}`),
    ...moneyItems.slice(0, 2).map((item) => `Review outstanding balance on ${item.project}`)
  ];

  return {
    mode: "real",
    focus: {
      primary: "Clear overdue work and outstanding money before opening another front.",
      reasons: [`${currency(outstandingTotal)} is outstanding`, `${overdueTasks.length} overdue tasks need attention`, `${staleProjects.length} active projects are going stale`],
      nextSteps: nextSteps.length ? nextSteps : ["Review active projects and keep the next action current."]
    },
    totals: { activeProjects: activeProjects.length, staleProjects: staleProjects.length, overdueTasks: overdueTasks.length, outstandingMoney: outstandingTotal, formattedOutstandingMoney: currency(outstandingTotal) },
    activeProjects: activeProjects.map((project) => ({
      id: project.id,
      name: project.name,
      priority: project.priority,
      lastUpdatedDaysAgo: metrics.get(project.id)?.days_since_last_worked,
      summary: project.next_action || project.blockers || "No next action recorded.",
      notes: []
    })),
    staleProjects,
    overdueTasks,
    outstandingMoney: { total: outstandingTotal, formattedTotal: currency(outstandingTotal), items: moneyItems },
    ideas: []
  };
}

async function buildRmccSnapshot(env) {
  return rmccConfigured(env) ? buildRemoteSnapshot(env) : buildMockSnapshot();
}

function base64Url(input) {
  return Buffer.from(input).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function signJwt(payload, secret) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function makeToken(env, room, identity, name) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({ iss: required(env, "LIVEKIT_API_KEY"), sub: identity, name, nbf: now - 5, exp: now + 30 * 60, video: { room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true } }, required(env, "LIVEKIT_API_SECRET"));
}

function sendJson(response, payload, status = 200) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "accept,content-type",
    "content-length": body.length
  });
  response.end(body);
}

function resolveRequestPath(url) {
  const decodedPath = decodeURIComponent(new URL(url, `http://127.0.0.1:${port}`).pathname);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const candidate = resolve(root, normalize(relativePath));
  return candidate.startsWith(root) ? candidate : null;
}

async function handleRequest(request, response) {
  const env = loadEnv();
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  if (request.method === "OPTIONS") {
    sendJson(response, { ok: true });
    return;
  }
  if (url.pathname === "/api/health") {
    sendJson(response, { ok: true, rmccMode: rmccConfigured(env) ? "real" : "mock", rmccApiConfigured: rmccConfigured(env), livekitUrlSet: Boolean(env.LIVEKIT_URL), livekitCredentialsSet: Boolean(env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET) });
    return;
  }
  if (url.pathname === "/api/rmcc/summary" || url.pathname.startsWith("/api/rmcc/")) {
    try {
      const snapshot = await buildRmccSnapshot(env);
      const route = url.pathname.replace("/api/rmcc/", "");
      const routes = { summary: snapshot, focus: snapshot.focus, projects: snapshot.activeProjects, stale: snapshot.staleProjects, tasks: snapshot.overdueTasks, money: snapshot.outstandingMoney, ideas: snapshot.ideas };
      if (!(route in routes)) {
        sendJson(response, { ok: false, error: "Unknown RMCC endpoint" }, 404);
        return;
      }
      sendJson(response, routes[route]);
    } catch (error) {
      sendJson(response, { ok: false, mode: "real", error: error instanceof Error ? error.message : "RMCC read failed" }, 502);
    }
    return;
  }
  if (url.pathname === "/api/livekit-token") {
    try {
      const room = url.searchParams.get("room") || "rmcc-voice-agent-local";
      const identity = url.searchParams.get("identity") || "steve-local";
      const name = url.searchParams.get("name") || "Steve";
      sendJson(response, { url: required(env, "LIVEKIT_URL"), room, identity, token: makeToken(env, room, identity, name) });
    } catch (error) {
      sendJson(response, { ok: false, error: error instanceof Error ? error.message : "LiveKit token failed" }, 500);
    }
    return;
  }
  const path = resolveRequestPath(request.url);
  if (!path || !existsSync(path) || !statSync(path).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": contentTypes[extname(path)] || "application/octet-stream" });
  createReadStream(path).pipe(response);
}

createServer((request, response) => {
  void handleRequest(request, response).catch((error) => {
    if (!response.headersSent) sendJson(response, { ok: false, error: error instanceof Error ? error.message : "Server error" }, 500);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`RMCC Voice Agent web server: http://127.0.0.1:${port}`);
  console.log(`Serving: ${root}`);
});
