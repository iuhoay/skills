#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { realpathSync } from "node:fs";
import { chmod, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const API_URL = process.env.LINEAR_API_URL || "https://api.linear.app/graphql";
const OAUTH_AUTHORIZE_URL = process.env.LINEAR_OAUTH_AUTHORIZE_URL || "https://linear.app/oauth/authorize";
const OAUTH_TOKEN_URL = process.env.LINEAR_OAUTH_TOKEN_URL || "https://api.linear.app/oauth/token";
const DEFAULT_OAUTH_CLIENT_ID = "69e1cfd85694a71886bef5c70edd7891";
const DEFAULT_OAUTH_REDIRECT_URI = "http://127.0.0.1:53682/callback";
const CONFIG_DIRECTORY = join(homedir(), ".config", "linear-cli");
const REPOSITORY_MAPPINGS_PATH = process.env.LINEAR_REPOSITORY_MAPPINGS_PATH
  || join(CONFIG_DIRECTORY, "repository-mappings.json");
const CONFIG_PATH = process.env.LINEAR_CONFIG_PATH || join(CONFIG_DIRECTORY, "config.json");
const KEYCHAIN_SERVICE = "iuhoay-linear-cli";
const KEYCHAIN_ACCOUNT = process.env.USER || "default";

const ISSUE_FIELDS = `
  id
  identifier
  title
  description
  url
  priority
  createdAt
  updatedAt
  team { id key name }
  state { id name type }
  cycle { id number name startsAt endsAt }
  project { id name slugId }
  assignee { id name email }
  labels { nodes { id name color } }
`;

class CliError extends Error {
  constructor(message, details = undefined) {
    super(message);
    this.details = details;
  }
}

function networkErrorMessage(error) {
  const cause = error.cause;
  if (!cause) return error.message;
  const code = cause.code ? `${cause.code}: ` : "";
  return `${error.message} (${code}${cause.message})`;
}

function parseArgs(argv) {
  const positionals = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      positionals.push(argument);
      continue;
    }

    const [rawKey, inlineValue] = argument.slice(2).split(/=(.*)/s, 2);
    const key = rawKey.replaceAll("-", "_");
    if (inlineValue !== undefined) {
      options[key] = inlineValue;
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      options[key] = argv[index + 1];
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return { positionals, options };
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function required(value, label) {
  if (value === undefined || value === null || value === "") {
    throw new CliError(`Missing required ${label}`);
  }
  return value;
}

function integerOption(value, label, { minimum, maximum }) {
  if (value === undefined) return undefined;
  const integer = Number.parseInt(value, 10);
  if (!Number.isInteger(integer) || integer < minimum || integer > maximum) {
    throw new CliError(`${label} must be an integer between ${minimum} and ${maximum}`);
  }
  return integer;
}

async function readJsonConfig() {
  try {
    return JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw new CliError(`Cannot read ${CONFIG_PATH}: ${error.message}`);
  }
}

function normalizeRepository(value) {
  if (!value) return undefined;
  if (typeof value !== "string") throw new CliError("--repository requires owner/repository or a Git URL");
  const trimmed = value.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const scpMatch = trimmed.match(/^[^@]+@[^:]+:(.+)$/);
  if (scpMatch) return scpMatch[1].toLowerCase();
  try {
    const url = new URL(trimmed);
    return url.pathname.replace(/^\//, "").toLowerCase();
  } catch {
    return trimmed.replace(/^github\.com[/:]/, "").toLowerCase();
  }
}

function currentRepository() {
  if (process.env.LINEAR_REPOSITORY) return normalizeRepository(process.env.LINEAR_REPOSITORY);
  const result = spawnSync("git", ["config", "--get", "remote.origin.url"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? normalizeRepository(result.stdout) : undefined;
}

async function readRepositoryMappings() {
  try {
    return JSON.parse(await readFile(REPOSITORY_MAPPINGS_PATH, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { version: 1, repositories: {} };
    throw new CliError(`Cannot read ${REPOSITORY_MAPPINGS_PATH}: ${error.message}`);
  }
}

async function writeRepositoryMappings(mappings) {
  await mkdir(dirname(REPOSITORY_MAPPINGS_PATH), { recursive: true });
  await writeFile(REPOSITORY_MAPPINGS_PATH, `${JSON.stringify(mappings, null, 2)}\n`, { mode: 0o600 });
  await chmod(REPOSITORY_MAPPINGS_PATH, 0o600);
}

async function repositoryContext() {
  const repository = currentRepository();
  const mappings = await readRepositoryMappings();
  return {
    repository,
    defaults: repository ? mappings.repositories?.[repository] : undefined,
    mappingFile: REPOSITORY_MAPPINGS_PATH,
  };
}

async function setRepositoryContext(options) {
  const repository = normalizeRepository(options.repository) || currentRepository();
  required(repository, "--repository or a Git origin");
  const mappings = await readRepositoryMappings();
  mappings.version = 1;
  mappings.repositories ||= {};
  mappings.repositories[repository] = {
    team: required(options.team, "--team"),
    project: required(options.project, "--project"),
  };
  await writeRepositoryMappings(mappings);
  return repositoryContext();
}

async function unsetRepositoryContext(options) {
  const repository = normalizeRepository(options.repository) || currentRepository();
  required(repository, "--repository or a Git origin");
  const mappings = await readRepositoryMappings();
  delete mappings.repositories?.[repository];
  await writeRepositoryMappings(mappings);
  return repositoryContext();
}

function keychainAvailable() {
  return process.env.LINEAR_DISABLE_KEYCHAIN !== "1"
    && process.platform === "darwin"
    && spawnSync("security", ["help"], { stdio: "ignore" }).status === 0;
}

function readKeychainCredential() {
  if (!keychainAvailable()) return undefined;
  const result = spawnSync(
    "security",
    ["find-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE, "-w"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  return result.status === 0 ? decodeCredential(result.stdout.trim()) : undefined;
}

function decodeCredential(value) {
  if (!value) return undefined;
  try {
    const credential = typeof value === "string" ? JSON.parse(value) : value;
    if (credential.kind === "oauth" || credential.kind === "apiKey") return credential;
  } catch {
    // Existing CLI versions stored the personal API key as a raw string.
  }
  return { kind: "apiKey", token: value };
}

async function readStoredCredential() {
  const keychainCredential = readKeychainCredential();
  if (keychainCredential) return { credential: keychainCredential, source: "macOS Keychain" };

  const config = await readJsonConfig();
  if (config.credential) return { credential: decodeCredential(config.credential), source: CONFIG_PATH };
  if (config.apiKey) return { credential: { kind: "apiKey", token: config.apiKey }, source: CONFIG_PATH };
  return undefined;
}

async function oauthTokenRequest(parameters) {
  let response;
  try {
    response = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(parameters),
    });
  } catch (error) {
    throw new CliError(`Cannot reach Linear OAuth: ${networkErrorMessage(error)}`);
  }

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new CliError(`Linear OAuth returned HTTP ${response.status} with a non-JSON response`, text.slice(0, 500));
  }
  if (!response.ok || payload.error) {
    throw new CliError(
      payload.error_description || payload.error || `Linear OAuth returned HTTP ${response.status}`,
      payload,
    );
  }
  return payload;
}

function oauthCredential(payload, { clientId, refreshToken } = {}) {
  return {
    kind: "oauth",
    accessToken: required(payload.access_token, "OAuth access_token"),
    refreshToken: payload.refresh_token || refreshToken,
    expiresAt: Date.now() + Number(payload.expires_in || 86400) * 1000,
    tokenType: payload.token_type || "Bearer",
    scope: payload.scope,
    clientId,
  };
}

async function refreshOAuthCredential(credential) {
  if (!credential.refreshToken || !credential.clientId) {
    throw new CliError("OAuth session cannot be refreshed. Run `linear auth login` again.");
  }
  const payload = await oauthTokenRequest({
    grant_type: "refresh_token",
    refresh_token: credential.refreshToken,
    client_id: credential.clientId,
  });
  return oauthCredential(payload, {
    clientId: credential.clientId,
    refreshToken: credential.refreshToken,
  });
}

async function resolveToken() {
  if (process.env.LINEAR_API_KEY) {
    return { token: process.env.LINEAR_API_KEY, source: "LINEAR_API_KEY", scheme: "apiKey" };
  }
  if (process.env.LINEAR_OAUTH_ACCESS_TOKEN) {
    return { token: process.env.LINEAR_OAUTH_ACCESS_TOKEN, source: "LINEAR_OAUTH_ACCESS_TOKEN", scheme: "bearer" };
  }

  const stored = await readStoredCredential();
  if (!stored) {
    throw new CliError("Linear credentials are not configured. Run `linear auth login` or set LINEAR_API_KEY.");
  }

  if (stored.credential.kind === "apiKey") {
    return { token: stored.credential.token, source: stored.source, scheme: "apiKey" };
  }

  let credential = stored.credential;
  if (!credential.expiresAt || credential.expiresAt <= Date.now() + 60_000) {
    credential = await refreshOAuthCredential(credential);
    await storeCredential(credential);
  }
  return { token: credential.accessToken, source: stored.source, scheme: "bearer" };
}

async function storeCredential(credential) {
  if (keychainAvailable()) {
    const result = spawnSync(
      "security",
      [
        "add-generic-password", "-U", "-a", KEYCHAIN_ACCOUNT,
        "-s", KEYCHAIN_SERVICE, "-w", JSON.stringify(credential),
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (result.status !== 0) {
      throw new CliError(`Cannot save credentials to macOS Keychain: ${result.stderr.trim()}`);
    }
    return "macOS Keychain";
  }

  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify({ credential }, null, 2)}\n`, { mode: 0o600 });
  await chmod(CONFIG_PATH, 0o600);
  return CONFIG_PATH;
}

async function deleteStoredToken() {
  if (keychainAvailable()) {
    spawnSync(
      "security",
      ["delete-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE],
      { stdio: "ignore" },
    );
  }

  await rm(CONFIG_PATH, { force: true });
}

async function promptSecret(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new CliError("Interactive API-key login requires a TTY. Set LINEAR_API_KEY and run `linear auth login --api-key --from-env`.");
  }

  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return new Promise((resolvePromise, rejectPromise) => {
    let value = "";
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
    };
    const onData = (character) => {
      if (character === "\r" || character === "\n") {
        cleanup();
        resolvePromise(value);
      } else if (character === "\u0003") {
        cleanup();
        rejectPromise(new CliError("Login cancelled"));
      } else if (character === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += character;
      }
    };
    process.stdin.on("data", onData);
  });
}

function openBrowser(url) {
  let command;
  let args;
  if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  const result = spawnSync(command, args, { stdio: "ignore" });
  return !result.error && result.status === 0;
}

function waitForOAuthCallback(redirectUri, expectedState, { timeoutMs = 300_000 } = {}) {
  const redirect = new URL(redirectUri);
  if (redirect.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(redirect.hostname)) {
    throw new CliError("OAuth redirect URI must use http://127.0.0.1 or http://localhost for the local callback.");
  }

  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    let timer;
    const finish = (error, code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.close();
      if (error) rejectPromise(error);
      else resolvePromise(code);
    };
    const server = createServer((request, response) => {
      response.setHeader("Connection", "close");
      const url = new URL(request.url, redirect.origin);
      if (url.pathname !== redirect.pathname) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const error = url.searchParams.get("error");
      const state = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      if (error) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Linear authorization was denied. You can close this tab.");
        finish(new CliError(`Linear authorization failed: ${error}`));
      } else if (state !== expectedState) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Invalid OAuth state. You can close this tab.");
        finish(new CliError("OAuth state mismatch; authorization was rejected."));
      } else if (!code) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Missing authorization code. You can close this tab.");
        finish(new CliError("Linear OAuth callback did not include an authorization code."));
      } else {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end("<!doctype html><title>Linear CLI authorized</title><p>Linear CLI is authorized. You can close this tab.</p>");
        finish(undefined, code);
      }
    });
    server.on("error", (error) => finish(new CliError(`Cannot start OAuth callback server: ${error.message}`)));
    server.listen(Number(redirect.port || 80), redirect.hostname);
    timer = setTimeout(
      () => finish(new CliError("Timed out waiting for Linear authorization.")),
      timeoutMs,
    );
    timer.unref?.();
  });
}

async function oauthLogin(options) {
  const clientId = options.client_id || process.env.LINEAR_OAUTH_CLIENT_ID || DEFAULT_OAUTH_CLIENT_ID;
  const redirectUri = options.redirect_uri || process.env.LINEAR_OAUTH_REDIRECT_URI || DEFAULT_OAUTH_REDIRECT_URI;
  const verifier = randomBytes(64).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(32).toString("hex");
  const authorizeUrl = new URL(OAUTH_AUTHORIZE_URL);
  authorizeUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "read,write",
    prompt: "consent",
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const callback = waitForOAuthCallback(redirectUri, state);
  process.stderr.write(`Open this URL to authorize Linear:\n${authorizeUrl}\n`);
  if (!options.no_open) openBrowser(authorizeUrl.toString());
  const code = await callback;
  const payload = await oauthTokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });
  const credential = oauthCredential(payload, { clientId });
  const storedIn = await storeCredential(credential);
  return { storedIn, authorization: "oauth-pkce", redirectUri };
}

function authorizationHeader(token, scheme) {
  if (scheme === "bearer" || process.env.LINEAR_AUTH_SCHEME?.toLowerCase() === "bearer" || token.startsWith("Bearer ")) {
    return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }
  return token;
}

async function graphql(query, variables = {}) {
  const { token, scheme } = await resolveToken();
  let response;

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader(token, scheme),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    throw new CliError(`Cannot reach Linear: ${networkErrorMessage(error)}`);
  }

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new CliError(`Linear returned HTTP ${response.status} with a non-JSON response`, text.slice(0, 500));
  }

  if (!response.ok || payload.errors?.length) {
    throw new CliError(
      payload.errors?.map((error) => error.message).join("; ") || `Linear returned HTTP ${response.status}`,
      payload.errors || payload,
    );
  }

  return payload.data;
}

async function viewer() {
  const data = await graphql(`query Viewer { viewer { id name email displayName } }`);
  return data.viewer;
}

async function teams() {
  const data = await graphql(`query Teams { teams(first: 250) { nodes { id key name } } }`);
  return data.teams.nodes;
}

async function resolveTeam(reference) {
  const candidates = await teams();
  const normalized = reference.toLowerCase();
  const team = candidates.find((candidate) =>
    [candidate.id, candidate.key, candidate.name].some((value) => value?.toLowerCase() === normalized),
  );
  if (!team) throw new CliError(`Unknown Linear team: ${reference}`);
  return team;
}

async function resolveUser(reference) {
  if (reference.toLowerCase() === "me") return viewer();

  const data = await graphql(`query Users { users(first: 250) { nodes { id name email displayName } } }`);
  const normalized = reference.toLowerCase();
  const user = data.users.nodes.find((candidate) =>
    [candidate.id, candidate.name, candidate.displayName, candidate.email]
      .some((value) => value?.toLowerCase() === normalized),
  );
  if (!user) throw new CliError(`Unknown Linear user: ${reference}`);
  return user;
}

async function resolveState(reference, teamId) {
  const data = await graphql(`query WorkflowStates { workflowStates(first: 250) { nodes { id name type team { id key } } } }`);
  const normalized = reference.toLowerCase();
  const state = data.workflowStates.nodes.find((candidate) =>
    candidate.team?.id === teamId && [candidate.id, candidate.name, candidate.type]
      .some((value) => value?.toLowerCase() === normalized),
  );
  if (!state) throw new CliError(`Unknown workflow state for this team: ${reference}`);
  return state;
}

async function cyclesForTeam(teamId, limit = 250) {
  const data = await graphql(
    `query Cycles($first: Int!, $filter: CycleFilter) {
      cycles(first: $first, filter: $filter) {
        nodes { id number name startsAt endsAt completedAt team { id key name } }
      }
    }`,
    { first: limit, filter: { team: { id: { eq: teamId } } } },
  );
  return data.cycles.nodes;
}

async function resolveCycle(reference, teamId) {
  const candidates = await cyclesForTeam(teamId);
  const normalized = reference.toLowerCase();
  const now = Date.now();
  const cycle = normalized === "current"
    ? candidates.find((candidate) =>
      new Date(candidate.startsAt).getTime() <= now && now < new Date(candidate.endsAt).getTime(),
    )
    : candidates.find((candidate) =>
      [candidate.id, candidate.name, String(candidate.number)]
        .some((value) => value?.toLowerCase() === normalized),
    );
  if (!cycle) throw new CliError(`Unknown Linear cycle for this team: ${reference}`);
  return cycle;
}

async function projectsForTeam(teamId, limit = 100) {
  const data = await graphql(
    `query Projects($first: Int!) {
      projects(first: $first) {
        nodes { id name slugId status { id name type } teams { nodes { id key name } } }
      }
    }`,
    { first: limit },
  );
  return data.projects.nodes.filter((project) =>
    project.teams.nodes.some((team) => team.id === teamId),
  );
}

async function resolveProject(reference, teamId) {
  const candidates = await projectsForTeam(teamId);
  const normalized = reference.toLowerCase();
  const matches = candidates.filter((candidate) =>
    [candidate.id, candidate.name, candidate.slugId]
      .some((value) => value?.toLowerCase() === normalized),
  );
  if (matches.length === 0) throw new CliError(`Unknown Linear project for this team: ${reference}`);
  if (matches.length > 1) throw new CliError(`Ambiguous Linear project: ${reference}; use its UUID`);
  return matches[0];
}

async function getIssue(identifier) {
  const data = await graphql(
    `query Issue($id: String!) { issue(id: $id) { ${ISSUE_FIELDS} } }`,
    { id: identifier },
  );
  if (!data.issue) throw new CliError(`Issue not found: ${identifier}`);
  return data.issue;
}

async function issueFilter(options) {
  const filter = {};
  let team;

  if (options.team) {
    team = await resolveTeam(options.team);
    filter.team = { id: { eq: team.id } };
  }
  if (options.state) {
    if (!team) throw new CliError("--state requires --team so the workflow state is unambiguous");
    const state = await resolveState(options.state, team.id);
    filter.state = { id: { eq: state.id } };
  }
  if (options.assignee) {
    const assignee = await resolveUser(options.assignee);
    filter.assignee = { id: { eq: assignee.id } };
  }
  return filter;
}

async function listIssues(options) {
  const limit = integerOption(options.limit ?? "20", "--limit", { minimum: 1, maximum: 250 });
  const filter = await issueFilter(options);

  if (options.query) {
    const data = await graphql(
      `query SearchIssues($term: String!, $first: Int!, $filter: IssueFilter) {
        searchIssues(term: $term, first: $first, filter: $filter) {
          nodes { ${ISSUE_FIELDS} }
          totalCount
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { term: options.query, first: limit, filter },
    );
    return {
      issues: data.searchIssues.nodes,
      count: data.searchIssues.nodes.length,
      totalCount: data.searchIssues.totalCount,
      hasNextPage: data.searchIssues.pageInfo.hasNextPage,
    };
  }

  const data = await graphql(
    `query Issues($first: Int!, $filter: IssueFilter) {
      issues(first: $first, filter: $filter) {
        nodes { ${ISSUE_FIELDS} }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    { first: limit, filter },
  );
  return {
    issues: data.issues.nodes,
    count: data.issues.nodes.length,
    hasNextPage: data.issues.pageInfo.hasNextPage,
  };
}

async function contentOption(options, name) {
  const inline = options[name];
  const file = options[`${name}_file`];
  if (inline !== undefined && file !== undefined) {
    throw new CliError(`Use either --${name.replaceAll("_", "-")} or --${name.replaceAll("_", "-")}-file, not both`);
  }
  if (file === "-") return readFile(0, "utf8");
  if (file !== undefined) return readFile(resolve(file), "utf8");
  return inline;
}

function optionList(value, label) {
  if (value === undefined) return undefined;
  if (value === true) throw new CliError(`${label} requires a comma-separated value`);
  const values = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (values.length === 0) throw new CliError(`${label} cannot be empty`);
  return values;
}

async function resolveLabelIds(value, optionName) {
  const references = optionList(value, optionName);
  if (!references) return undefined;

  const data = await graphql(`query IssueLabels { issueLabels(first: 250) { nodes { id name color } } }`);
  return references.map((reference) => {
    const normalized = reference.toLowerCase();
    const matches = data.issueLabels.nodes.filter((label) =>
      label.id.toLowerCase() === normalized || label.name.toLowerCase() === normalized,
    );
    if (matches.length === 0) throw new CliError(`Unknown Linear label: ${reference}`);
    if (matches.length > 1) throw new CliError(`Ambiguous Linear label: ${reference}; use its UUID`);
    return matches[0].id;
  });
}

async function createIssue(options) {
  const context = await repositoryContext();
  const teamReference = options.team || context.defaults?.team;
  const team = await resolveTeam(required(teamReference, "--team or a repository team mapping"));
  const input = {
    teamId: team.id,
    title: required(options.title, "--title"),
  };

  const description = await contentOption(options, "description");
  if (description !== undefined) input.description = description;
  const priority = integerOption(options.priority, "--priority", { minimum: 0, maximum: 4 });
  if (priority !== undefined) input.priority = priority;
  if (options.assignee) input.assigneeId = (await resolveUser(options.assignee)).id;
  if (options.state) input.stateId = (await resolveState(options.state, team.id)).id;
  if (options.cycle) input.cycleId = (await resolveCycle(options.cycle, team.id)).id;
  const mappedProject = context.defaults?.team?.toLowerCase() === team.key.toLowerCase()
    ? context.defaults.project
    : undefined;
  const projectReference = options.project || mappedProject;
  if (projectReference) input.projectId = (await resolveProject(projectReference, team.id)).id;
  const labelIds = await resolveLabelIds(options.labels ?? options.label, "--labels");
  if (labelIds) input.labelIds = labelIds;

  const data = await graphql(
    `mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) { success issue { ${ISSUE_FIELDS} } }
    }`,
    { input },
  );
  if (!data.issueCreate.success) throw new CliError("Linear did not create the issue");
  return data.issueCreate.issue;
}

async function updateIssue(identifier, options) {
  const issue = await getIssue(identifier);
  const input = {};

  if (options.title !== undefined) input.title = options.title;
  const description = await contentOption(options, "description");
  if (description !== undefined) input.description = description;
  const priority = integerOption(options.priority, "--priority", { minimum: 0, maximum: 4 });
  if (priority !== undefined) input.priority = priority;
  if (options.assignee) input.assigneeId = (await resolveUser(options.assignee)).id;
  if (options.state) input.stateId = (await resolveState(options.state, issue.team.id)).id;
  if (options.cycle) input.cycleId = (await resolveCycle(options.cycle, issue.team.id)).id;
  if (options.project) input.projectId = (await resolveProject(options.project, issue.team.id)).id;
  const labelIds = await resolveLabelIds(options.labels ?? options.label, "--labels");
  if (labelIds) input.labelIds = labelIds;
  const addedLabelIds = await resolveLabelIds(options.add_label, "--add-label");
  if (addedLabelIds) input.addedLabelIds = addedLabelIds;
  const removedLabelIds = await resolveLabelIds(options.remove_label, "--remove-label");
  if (removedLabelIds) input.removedLabelIds = removedLabelIds;

  if (Object.keys(input).length === 0) throw new CliError("No update fields were provided");

  const data = await graphql(
    `mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) { success issue { ${ISSUE_FIELDS} } }
    }`,
    { id: issue.id, input },
  );
  if (!data.issueUpdate.success) throw new CliError(`Linear did not update ${identifier}`);
  return data.issueUpdate.issue;
}

async function createComment(identifier, options) {
  const issue = await getIssue(identifier);
  const body = required(await contentOption(options, "body"), "--body or --body-file");
  const data = await graphql(
    `mutation CreateComment($input: CommentCreateInput!) {
      commentCreate(input: $input) { success comment { id body url createdAt user { id name email } } }
    }`,
    { input: { issueId: issue.id, body } },
  );
  if (!data.commentCreate.success) throw new CliError(`Linear did not comment on ${identifier}`);
  return data.commentCreate.comment;
}

async function rawGraphql(options) {
  const query = options.query_file
    ? await readFile(resolve(options.query_file), "utf8")
    : required(options.query, "--query or --query-file");
  let variables = {};
  if (options.variables_file) variables = JSON.parse(await readFile(resolve(options.variables_file), "utf8"));
  if (options.variables) variables = JSON.parse(options.variables);
  return graphql(query, variables);
}

async function installCli(options) {
  const targetDir = resolve(options.dir || join(homedir(), ".local", "bin"));
  const target = join(targetDir, options.name || "linear");
  const source = realpathSync(process.argv[1]);

  await mkdir(targetDir, { recursive: true });
  await rm(target, { force: true });
  await symlink(source, target);
  return { installed: target, source, pathHint: `${targetDir} must be present in PATH` };
}

function help() {
  return `linear — small JSON-first CLI for Linear\n\nUsage:\n  linear install [--dir ~/.local/bin]\n  linear auth login [--client-id ID] [--redirect-uri URI] [--no-open]\n  linear auth login --api-key [--from-env]\n  linear auth status\n  linear auth logout\n  linear context\n  linear context set --team ENG --project Platform [--repository owner/repo]\n  linear context unset [--repository owner/repo]\n  linear viewer\n  linear teams list\n  linear cycles list --team ENG [--limit 20]\n  linear projects list --team ENG [--limit 20]\n  linear issues list [--team ENG] [--state Todo] [--assignee me] [--query text] [--limit 20]\n  linear issues get ENG-123\n  linear issues create --team ENG --title TITLE [--description TEXT|--description-file FILE] [--priority 0..4] [--assignee me] [--state Todo] [--cycle current|NUMBER] [--project Platform] [--labels Bug,Commit]\n  linear issues update ENG-123 [--title TITLE] [--description TEXT|--description-file FILE] [--priority 0..4] [--assignee me] [--state Done] [--cycle current|NUMBER] [--project Platform] [--labels Bug] [--add-label Commit] [--remove-label Bug]\n  linear comments create ENG-123 --body TEXT|--body-file FILE\n  linear graphql --query QUERY|--query-file FILE [--variables JSON|--variables-file FILE]\n\nAuthentication:\n  OAuth 2.0 + PKCE is the default. The callback URI registered in Linear must be:\n  ${DEFAULT_OAUTH_REDIRECT_URI}\n\nCredential resolution order:\n  1. LINEAR_API_KEY or LINEAR_OAUTH_ACCESS_TOKEN\n  2. macOS Keychain\n  3. ${CONFIG_PATH}\n\nEnvironment:\n  LINEAR_API_KEY             Personal Linear API key fallback\n  LINEAR_OAUTH_ACCESS_TOKEN  Non-refreshing OAuth token override\n  LINEAR_OAUTH_CLIENT_ID     Override OAuth application client ID\n  LINEAR_OAUTH_REDIRECT_URI  Override registered local callback URI\n  LINEAR_API_URL             Override GraphQL endpoint (testing/proxy)\n  LINEAR_DISABLE_KEYCHAIN=1  Skip macOS Keychain lookup\n`;
}

async function main(argv = process.argv.slice(2)) {
  const { positionals, options } = parseArgs(argv);
  const [resource, action, identifier] = positionals;

  if (!resource || resource === "help" || options.help) {
    process.stdout.write(help());
    return;
  }

  if (resource === "install") {
    print(await installCli(options));
  } else if (resource === "context" && action === "set") {
    print(await setRepositoryContext(options));
  } else if (resource === "context" && action === "unset") {
    print(await unsetRepositoryContext(options));
  } else if (resource === "context" && !action) {
    print(await repositoryContext());
  } else if (resource === "auth" && action === "login") {
    let login;
    if (options.api_key || options.from_env) {
      const token = options.from_env
        ? required(process.env.LINEAR_API_KEY, "LINEAR_API_KEY")
        : await promptSecret("Linear personal API key: ");
      login = {
        storedIn: await storeCredential({ kind: "apiKey", token: token.trim() }),
        authorization: "personal-api-key",
      };
    } else {
      login = await oauthLogin(options);
    }
    print({ authenticated: true, ...login, viewer: await viewer() });
  } else if (resource === "auth" && action === "status") {
    const credentials = await resolveToken();
    print({
      authenticated: true,
      source: credentials.source,
      authorization: credentials.scheme === "bearer" ? "oauth" : "personal-api-key",
      viewer: await viewer(),
    });
  } else if (resource === "auth" && action === "logout") {
    await deleteStoredToken();
    print({ authenticated: false });
  } else if (resource === "viewer") {
    print(await viewer());
  } else if (resource === "teams" && action === "list") {
    print({ teams: await teams() });
  } else if (resource === "cycles" && action === "list") {
    const team = await resolveTeam(required(options.team, "--team"));
    const limit = integerOption(options.limit ?? "20", "--limit", { minimum: 1, maximum: 250 });
    print({ team, cycles: await cyclesForTeam(team.id, limit) });
  } else if (resource === "projects" && action === "list") {
    const team = await resolveTeam(required(options.team, "--team"));
    const limit = integerOption(options.limit ?? "20", "--limit", { minimum: 1, maximum: 100 });
    print({ team, projects: (await projectsForTeam(team.id)).slice(0, limit) });
  } else if (resource === "issues" && action === "list") {
    print(await listIssues(options));
  } else if (resource === "issues" && action === "get") {
    print(await getIssue(required(identifier, "issue identifier")));
  } else if (resource === "issues" && action === "create") {
    print(await createIssue(options));
  } else if (resource === "issues" && action === "update") {
    print(await updateIssue(required(identifier, "issue identifier"), options));
  } else if (resource === "comments" && action === "create") {
    print(await createComment(required(identifier, "issue identifier"), options));
  } else if (resource === "graphql") {
    print(await rawGraphql(options));
  } else {
    throw new CliError(`Unknown command: ${positionals.join(" ")}\n\n${help()}`);
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const payload = {
      error: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    };
    process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exitCode = 1;
  });
}

export { graphql, main, parseArgs };
