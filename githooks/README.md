# Git hooks (CPSC 436C template)

Enable hooks:

```bash
git config core.hooksPath githooks
```

Hooks provided:

- **pre-commit**
  - Runs **root** `npm run lint` (**ESLint** on `tests/`, `api/src`, `worker` per root [eslint.config.js](../eslint.config.js)) and **`npm test`** (including `tests/redbar/`, `tests/smoke/`, `tests/integration/`). Integration tests need a running API and network; start the stack with **[docker-compose.yml](../docker-compose.yml)** (`docker compose up` from the repo root) so Mongo, Redis, API, and Worker match a reproducible environment. If you do not have that locally, set **`PRE_COMMIT_SKIP_ROOT_INTEGRATION=1`** to run only `test:redbar` and `test:smoke`, or use **`SKIP_HOOK_CHECKS=1`** to skip all verification.
  - Runs per-service `npm run lint` and `npm test` in `api/` (`npm install`), `worker/` (`npm install`), and `frontend/` (`npm ci`).
  - Then updates `capstone/team-pointer.json` when a team submodule or `capstone/team_repo.txt` is configured (same as before).
- **pre-push:** rejects pushes that include unsigned commits.

## Why no GitHub Actions at the monorepo root?

Lint and tests are enforced **locally** via the hook above (same commands CI would run). **Docker Compose** gives a consistent runtime for integration tests. Deploy and PR automation live under **[.github/workflows/](../.github/workflows/)** — see [.github/workflows/README.md](../.github/workflows/README.md) (currently archived/dispatch-only).

## Skip or narrow verification

Skip lint/test steps only (team-pointer logic still runs):

```bash
SKIP_HOOK_CHECKS=1 git commit ...
```

Run root redbar + smoke only (omit `tests/integration/`):

```bash
PRE_COMMIT_SKIP_ROOT_INTEGRATION=1 git commit ...
```

## Requirements

- Node.js and npm on `PATH`.
- First `frontend` run may take a while while dependencies install.
- For full `npm test` including integration: Docker (or compatible runtime) for `docker compose` at the repo root.
