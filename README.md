# TrigGuard Authorization — GitHub Action

Authorize irreversible execution using the TrigGuard protocol. The action calls your execution gateway at **`authorityUrl/execute`**, **verifies the receipt locally** (so a compromised server or MITM cannot forge PERMIT), and fails the workflow if the receipt is invalid or the decision is not PERMIT.

## Target distribution

**Publish as:** `TrigGuard-AI/authorize`  
**Consumer usage:**

```yaml
- uses: TrigGuard-AI/authorize@v1
```

Older examples may reference a different GitHub namespace — the only supported consumer path is **`TrigGuard-AI/authorize@v1`**.

## Flow

1. **Request** — POST to `gateway_url/execute` with `surface` and `actorId` (camelCase in JSON).
2. **Receipt** — Response includes a signed receipt.
3. **Verify** — Action fetches `gateway_url/.well-known/trigguard/keys.json` and verifies the signature over `receiptHash`.
4. **Continue** — If verification passes and `decision === "PERMIT"`, the step succeeds; otherwise the workflow fails.

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `surface` | Yes | Execution surface (e.g. `deploy.release`, `database.migrate`). |
| `gateway_url` | One of these | Execution gateway base URL (staging or `https://api.trigguardai.com` when live). |
| `endpoint` | One of these | Legacy alias for `gateway_url`. |
| `authorityUrl` | One of these | Legacy alias for `gateway_url`. |
| `actor_id` | No | Actor identifier (default: `github-actions`). |
| `actorId` | No | Legacy alias for `actor_id`. |
| `authToken` | No | Bearer token if the gateway requires authentication. |

## Example workflow

```yaml
name: Deploy

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: TrigGuard authorization
        uses: TrigGuard-AI/authorize@v1
        with:
          surface: deploy.release
          gateway_url: https://YOUR-CLOUD-RUN-URL.run.app
          authToken: ${{ secrets.TRIGGUARD_CLOUD_TOKEN }}

      - name: Deploy
        run: ./deploy.sh
```

## Outputs

- `decision` — TrigGuard decision (e.g. PERMIT).
- `execution-id` — Execution ID from the receipt.
- `receipt` — Receipt JSON string (for audit or artifacts).

## Local verification

The action verifies the receipt **in the runner** using the gateway’s public key from `GET /.well-known/trigguard/keys.json`.

## Publishing (maintainers)

1. From this directory: `npm ci && npm run build` (regenerates `dist/` via `@vercel/ncc`).
2. Create or use repo **`https://github.com/TrigGuard-AI/authorize`** with these files at the repo root.
3. Tag **`v1`** on the commit you want consumers to pin (`git tag v1 && git push origin v1`).
4. Optional: list on GitHub Marketplace.

See [docs/distribution/PUBLISH_GITHUB_ACTION.md](../docs/distribution/PUBLISH_GITHUB_ACTION.md) for the full runbook (update any paths in that doc to **`TrigGuard-AI/authorize`**).

For use **inside** the TrigGuard monorepo before publish:

```yaml
- uses: ./trigguard-github-action
```

Or the composite under `.github/actions/deploy-authorization` if present.
