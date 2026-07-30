/**
 * Shared LIVE gate for redbar tests that hit Docker + Auth0.
 * Import this module first in any file that needs LIVE / sub.
 */
import { before } from "node:test";
import { apiReachable, getM2MToken, jwtSub } from "../helpers/redbar-live.mjs";

export let LIVE = false;
export let sub = "";

before(async () => {
  LIVE = await apiReachable();
  if (LIVE) {
    try {
      sub = jwtSub(await getM2MToken());
    } catch {
      LIVE = false;
    }
  }
});
