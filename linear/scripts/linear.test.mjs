import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("./linear.mjs", import.meta.url));
let server;
let endpoint;
const requests = [];

before(async () => {
  server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;

    if (request.url === "/oauth/token") {
      const parameters = Object.fromEntries(new URLSearchParams(body));
      requests.push({ oauthToken: parameters });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        access_token: "oauth-access-token",
        refresh_token: "oauth-refresh-token",
        token_type: "Bearer",
        expires_in: 86400,
        scope: "read write",
      }));
      return;
    }

    const payload = JSON.parse(body);
    requests.push(payload);

    let data;
    if (payload.query.includes("query Viewer")) {
      data = { viewer: { id: "user-1", name: "Jack", email: "jack@example.com", displayName: "Jack" } };
    } else if (payload.query.includes("query Teams")) {
      data = { teams: { nodes: [{ id: "team-1", key: "ENG", name: "Engineering" }] } };
    } else if (payload.query.includes("query Projects")) {
      data = {
        projects: {
          nodes: [{
            id: "project-platform",
            name: "Platform",
            slugId: "platform-slug",
            status: { id: "project-status", name: "In Progress", type: "started" },
            teams: { nodes: [{ id: "team-1", key: "ENG", name: "Engineering" }] },
          }],
        },
      };
    } else if (payload.query.includes("query Cycles")) {
      data = {
        cycles: {
          nodes: [{
            id: "cycle-current",
            number: 36,
            name: null,
            startsAt: "2020-01-01T00:00:00.000Z",
            endsAt: "2030-01-01T00:00:00.000Z",
            completedAt: null,
            team: { id: "team-1", key: "ENG", name: "Engineering" },
          }],
        },
      };
    } else if (payload.query.includes("query IssueLabels")) {
      data = {
        issueLabels: {
          nodes: [{ id: "label-bug", name: "Bug", color: "#EB5757" }],
        },
      };
    } else if (payload.query.includes("query SearchIssues")) {
      data = {
        searchIssues: {
          nodes: [{
            id: "issue-1",
            identifier: "ENG-123",
            title: "Fix dashboard ordering",
            description: "Cached and realtime pages diverge.",
            url: "https://linear.app/acme/issue/ENG-123",
            priority: 2,
            createdAt: "2026-07-24T00:00:00.000Z",
            updatedAt: "2026-07-24T00:00:00.000Z",
            team: { id: "team-1", key: "ENG", name: "Engineering" },
            state: { id: "state-1", name: "Todo", type: "unstarted" },
            assignee: null,
            labels: { nodes: [] },
          }],
          totalCount: 1,
          pageInfo: { hasNextPage: false, endCursor: "cursor-1" },
        },
      };
    } else if (payload.query.includes("mutation CreateIssue")) {
      data = {
        issueCreate: {
          success: true,
          issue: {
            id: "issue-1",
            identifier: "ENG-123",
            title: payload.variables.input.title,
            description: payload.variables.input.description,
            url: "https://linear.app/acme/issue/ENG-123",
            priority: 0,
            createdAt: "2026-07-24T00:00:00.000Z",
            updatedAt: "2026-07-24T00:00:00.000Z",
            team: { id: "team-1", key: "ENG", name: "Engineering" },
            state: { id: "state-1", name: "Todo", type: "unstarted" },
            assignee: null,
            labels: { nodes: [] },
          },
        },
      };
    } else {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ errors: [{ message: "Unexpected operation" }] }));
      return;
    }

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ data }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  endpoint = `http://127.0.0.1:${server.address().port}/graphql`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function availablePort() {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

function run(args, envOverrides = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      env: {
        ...process.env,
        LINEAR_API_KEY: "test-key",
        LINEAR_API_URL: endpoint,
        ...envOverrides,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("runs when invoked through an installed symlink", async () => {
  const directory = await mkdtemp(join(tmpdir(), "linear-cli-"));
  const link = join(directory, "linear");
  await symlink(cliPath, link);

  try {
    const child = spawn(link, ["--help"], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const code = await new Promise((resolve) => child.on("close", resolve));

    assert.equal(code, 0, stderr);
    assert.match(stdout, /linear — small JSON-first CLI/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("logs in through OAuth PKCE and stores refreshable credentials", async () => {
  const directory = await mkdtemp(join(tmpdir(), "linear-oauth-"));
  const configPath = join(directory, "config.json");
  const callback = `http://127.0.0.1:${await availablePort()}/callback`;
  const origin = new URL(endpoint).origin;
  const env = {
    ...process.env,
    LINEAR_API_URL: endpoint,
    LINEAR_OAUTH_AUTHORIZE_URL: `${origin}/oauth/authorize`,
    LINEAR_OAUTH_TOKEN_URL: `${origin}/oauth/token`,
    LINEAR_CONFIG_PATH: configPath,
    LINEAR_DISABLE_KEYCHAIN: "1",
  };
  delete env.LINEAR_API_KEY;
  delete env.LINEAR_OAUTH_ACCESS_TOKEN;

  try {
    const child = spawn(process.execPath, [
      cliPath, "auth", "login", "--no-open", "--redirect-uri", callback,
    ], { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    const authorizeUrl = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`OAuth URL was not printed: ${stderr}`)), 5000);
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
        const match = stderr.match(/https?:\/\/\S+\/oauth\/authorize\?\S+/);
        if (match) {
          clearTimeout(timeout);
          resolve(new URL(match[0]));
        }
      });
      child.on("error", reject);
    });

    assert.equal(authorizeUrl.searchParams.get("code_challenge_method"), "S256");
    assert.equal(authorizeUrl.searchParams.get("client_id"), "69e1cfd85694a71886bef5c70edd7891");
    const callbackUrl = new URL(callback);
    callbackUrl.searchParams.set("code", "authorization-code");
    callbackUrl.searchParams.set("state", authorizeUrl.searchParams.get("state"));
    const callbackResponse = await fetch(callbackUrl);
    assert.equal(callbackResponse.status, 200);

    const code = await new Promise((resolve) => child.on("close", resolve));
    assert.equal(code, 0, stderr);
    const output = JSON.parse(stdout);
    assert.equal(output.authorization, "oauth-pkce");
    assert.equal(output.viewer.id, "user-1");

    const config = JSON.parse(await readFile(configPath, "utf8"));
    assert.equal(config.credential.kind, "oauth");
    assert.equal(config.credential.refreshToken, "oauth-refresh-token");
    assert.equal(config.credential.clientId, "69e1cfd85694a71886bef5c70edd7891");

    const tokenRequest = requests.find((request) => request.oauthToken?.grant_type === "authorization_code");
    assert.equal(tokenRequest.oauthToken.code, "authorization-code");
    assert.ok(tokenRequest.oauthToken.code_verifier);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("prints the authenticated viewer as JSON", async () => {
  const result = await run(["viewer"]);

  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    id: "user-1",
    name: "Jack",
    email: "jack@example.com",
    displayName: "Jack",
  });
});

test("uses Linear search with a resolved team filter", async () => {
  const result = await run(["issues", "list", "--team", "ENG", "--query", "dashboard"]);

  assert.equal(result.code, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.issues[0].identifier, "ENG-123");
  assert.equal(output.totalCount, 1);

  const search = requests.find((request) => request.query?.includes("query SearchIssues"));
  assert.deepEqual(search.variables, {
    term: "dashboard",
    first: 20,
    filter: { team: { id: { eq: "team-1" } } },
  });
});

test("applies local repository mappings when creating an issue", async () => {
  const directory = await mkdtemp(join(tmpdir(), "linear-mappings-"));
  const mappingPath = join(directory, "repository-mappings.json");
  await writeFile(mappingPath, JSON.stringify({
    version: 1,
    repositories: {
      "acme/web-app": { team: "ENG", project: "Platform" },
    },
  }));

  try {
    const result = await run([
      "issues", "create",
      "--title", "Fix mapped repository issue",
    ], {
      LINEAR_REPOSITORY: "git@github.com:acme/web-app.git",
      LINEAR_REPOSITORY_MAPPINGS_PATH: mappingPath,
    });

    assert.equal(result.code, 0, result.stderr);
    const mutations = requests.filter((request) => request.query?.includes("mutation CreateIssue"));
    assert.deepEqual(mutations.at(-1).variables.input, {
      teamId: "team-1",
      title: "Fix mapped repository issue",
      projectId: "project-platform",
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("resolves the team and creates an issue", async () => {
  const result = await run([
    "issues", "create",
    "--team", "ENG",
    "--title", "Fix dashboard ordering",
    "--description", "Cached and realtime pages diverge.",
  ]);

  assert.equal(result.code, 0, result.stderr);
  const issue = JSON.parse(result.stdout);
  assert.equal(issue.identifier, "ENG-123");
  assert.equal(issue.title, "Fix dashboard ordering");

  const mutation = requests.find((request) =>
    request.query?.includes("mutation CreateIssue")
      && request.variables.input.title === "Fix dashboard ordering",
  );
  assert.deepEqual(mutation.variables.input, {
    teamId: "team-1",
    title: "Fix dashboard ordering",
    description: "Cached and realtime pages diverge.",
  });
});

test("resolves the team's project when creating an issue", async () => {
  const result = await run([
    "issues", "create",
    "--team", "ENG",
    "--title", "Fix project issue",
    "--project", "Platform",
  ]);

  assert.equal(result.code, 0, result.stderr);
  const mutations = requests.filter((request) => request.query?.includes("mutation CreateIssue"));
  assert.deepEqual(mutations.at(-1).variables.input, {
    teamId: "team-1",
    title: "Fix project issue",
    projectId: "project-platform",
  });
});

test("resolves the team's current cycle when creating an issue", async () => {
  const result = await run([
    "issues", "create",
    "--team", "ENG",
    "--title", "Fix cycle issue",
    "--cycle", "current",
  ]);

  assert.equal(result.code, 0, result.stderr);
  const mutations = requests.filter((request) => request.query?.includes("mutation CreateIssue"));
  assert.deepEqual(mutations.at(-1).variables.input, {
    teamId: "team-1",
    title: "Fix cycle issue",
    cycleId: "cycle-current",
  });
});

test("resolves labels by name when creating an issue", async () => {
  const result = await run([
    "issues", "create",
    "--team", "ENG",
    "--title", "Fix labeled issue",
    "--label", "Bug",
  ]);

  assert.equal(result.code, 0, result.stderr);
  const mutations = requests.filter((request) => request.query?.includes("mutation CreateIssue"));
  assert.deepEqual(mutations.at(-1).variables.input, {
    teamId: "team-1",
    title: "Fix labeled issue",
    labelIds: ["label-bug"],
  });
});

test("fails clearly when credentials are missing", async () => {
  const child = spawn(process.execPath, [cliPath, "viewer"], {
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      LINEAR_API_URL: endpoint,
      LINEAR_CONFIG_PATH: "/tmp/nonexistent-linear-cli-config.json",
      LINEAR_DISABLE_KEYCHAIN: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const code = await new Promise((resolve) => child.on("close", resolve));

  assert.equal(code, 1);
  assert.match(stderr, /credentials are not configured/);
});

test("includes the underlying network error when Linear cannot be reached", async () => {
  const port = await availablePort();
  const result = await run(["viewer"], {
    LINEAR_API_URL: `http://127.0.0.1:${port}/graphql`,
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Cannot reach Linear: fetch failed \(ECONNREFUSED:/);
});
