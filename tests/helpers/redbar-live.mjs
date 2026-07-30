/**
 * Helpers for redbar tests that hit the real API + Mongo + Redis (Docker Compose).
 * Set API_BASE, MONGO_URL, REDIS_URL or use defaults for local StudyFlow stack.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId } from "mongodb";
import { createClient } from "redis";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../api/src/.env");

export const API_BASE = process.env.API_BASE || "http://127.0.0.1:4000";
export const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/study";
export const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

function loadEnvFile() {
  const envVars = {};
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1).trim();
    }
  } catch {
    /* optional */
  }
  return envVars;
}

const fileEnv = loadEnvFile();
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || fileEnv.AUTH0_DOMAIN;
const CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID || fileEnv.AUTH0_M2M_CLIENT_ID;
const CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET || fileEnv.AUTH0_M2M_CLIENT_SECRET;
const AUDIENCE = process.env.AUTH0_AUDIENCE || fileEnv.AUTH0_AUDIENCE || "https://studyflow-api";

let cachedToken = null;

export async function getM2MToken() {
  if (cachedToken) return cachedToken;
  if (!AUTH0_DOMAIN || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing Auth0 M2M: set AUTH0_M2M_CLIENT_ID/SECRET or configure api/src/.env"
    );
  }
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience: AUDIENCE,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    throw new Error(`Auth0 token failed: ${res.status} ${await res.text()}`);
  }
  const { access_token } = await res.json();
  cachedToken = access_token;
  return cachedToken;
}

/** Decode JWT payload without verification (enough for sub in tests). */
export function jwtSub(token) {
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("Invalid JWT");
  const json = Buffer.from(parts[1], "base64url").toString("utf8");
  const payload = JSON.parse(json);
  return payload.sub;
}

export async function authFetch(path, options = {}) {
  const token = await getM2MToken();
  const url = `${API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

export async function mongoDb() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  return client.db();
}

/** Returns `{ client, db }` so callers can `await client.close()` after tests. */
export async function mongoWithClient() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  return { client, db: client.db() };
}

export function redisClient() {
  return createClient({ url: REDIS_URL });
}

export async function apiReachable() {
  try {
    const r = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

export { ObjectId };
