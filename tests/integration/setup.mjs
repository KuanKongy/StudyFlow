/**
 * Integration test setup — Auth0 M2M token + authFetch helper
 *
 * Reads credentials from api/src/.env and fetches a token
 * using the client_credentials grant. Exports authFetch() for tests.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../api/src/.env");

function loadEnv() {
  const envVars = {};
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
    }
  } catch (err) {
    console.error(`Failed to read ${envPath}:`, err.message);
  }
  return envVars;
}

const env = loadEnv();
const API_BASE = process.env.API_BASE || "http://localhost:4000";
const AUTH0_DOMAIN = env.AUTH0_DOMAIN || process.env.AUTH0_DOMAIN;
const CLIENT_ID = env.AUTH0_M2M_CLIENT_ID || process.env.AUTH0_M2M_CLIENT_ID;
const CLIENT_SECRET = env.AUTH0_M2M_CLIENT_SECRET || process.env.AUTH0_M2M_CLIENT_SECRET;
const AUDIENCE = env.AUTH0_AUDIENCE || process.env.AUTH0_AUDIENCE || "https://studyflow-api";

let cachedToken = null;

export async function getToken() {
  if (cachedToken) return cachedToken;

  if (!AUTH0_DOMAIN || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing Auth0 M2M credentials. Add AUTH0_M2M_CLIENT_ID and AUTH0_M2M_CLIENT_SECRET to api/src/.env"
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
    const body = await res.text();
    throw new Error(`Auth0 token request failed (${res.status}): ${body}`);
  }

  const { access_token } = await res.json();
  cachedToken = access_token;
  return cachedToken;
}

export async function authFetch(path, options = {}) {
  const token = await getToken();
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
