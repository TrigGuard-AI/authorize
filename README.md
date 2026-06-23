# TrigGuard — GitHub Actions

## Decision gate (Phase 12)

**[`decision-gate/`](decision-gate/)** — **`TrigGuard Authorization Gate`**: calls Phase 10 **`sdk/node`** **`authorize()`** (decision endpoint). Fails the job unless **`decision === "PERMIT"`**. No policy logic in the action. See **`decision-gate/README.md`** and **`docs/integrations/GITHUB_ACTIONS_GATE.md`**.

---

## Execution authorize (receipt / `POST /execute`)

Authorize irreversible execution using the TrigGuard protocol. The action calls your execution gateway at **`authorityUrl/execute`**, **verifies the receipt locally** (so a compromised server or MITM cannot forge PERMIT), and fails the workflow if the receipt is invalid or the decision is not PERMIT.

## Target distribution

**Publish as:** `TrigGuard-AI/authorize`  
**Consumer usage:**

```yaml
- uses: TrigGuard-AI/authorize@v1
```

Older examples may reference a different GitHub namespace — the only supported consumer path is **`TrigGuard-AI/authorize@v1`**.

## Flow

1. **Request** — POST to `gateway_url/execute` with `surface` and `actorId` (camelCase in JSON). Optional **`repository`** and **`branch`** are sent as `context.repository` / `context.branch` so gateway policy can allowlist `deploy.release` per repo.
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
| `workload_identity_provider` | OIDC path | GCP WIF provider resource id (`projects/.../providers/...`). Use with `service_account`. |
| `service_account` | OIDC path | GCP service account email (`roles/run.invoker` on the gateway). |
| `authToken` | No | Legacy static bearer; prefer OIDC for CI. |
| `repository` | No | e.g. `${{ github.repository }}` — passed to gateway `context.repository` for policy. |
| `branch` | No | e.g. `${{ github.ref_name }}` — optional `context.branch` for policy. |
| `execution_mode` | No | `enforce` (default) or `observe` — evaluate policy without failing the workflow. Outputs `would-decision`. |

### Observe mode (rollout)

Use `execution_mode: observe` during policy rollout. The step succeeds even when policy would deny; check output `would-decision` and workflow warnings.

```yaml
- uses: TrigGuard-AI/authorize@v1
  with:
    surface: deploy.release
    gateway_url: https://api.trigguardai.com
    execution_mode: observe
    repository: ${{ github.repository }}
```


1. In GCP, create a **Workload Identity Federation** pool + GitHub OIDC provider, bind a **service account** with `roles/run.invoker` on the Cloud Run service, and grant `roles/iam.workloadIdentityUser` to the GitHub principal (`principalSet` for your org/repo). See `packages/trigguard-cloud/scripts/setup-github-wif.sh` in the TrigGuard monorepo.
2. In the workflow job, set **`permissions: { id-token: write, contents: read }`** so the runner can mint an OIDC JWT.
3. Pass **`workload_identity_provider`** and **`service_account`** to this action (no `TRIGGUARD_CLOUD_TOKEN`).

The action exchanges the GitHub OIDC token for a **Google identity token** for the Cloud Run URL, then calls `POST /execute` and `GET /.well-known/trigguard/keys.json` with the same token.

## Example workflow

```yaml
name: Deploy

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: TrigGuard authorization
        uses: TrigGuard-AI/authorize@v1
        with:
          surface: deploy.release
          gateway_url: https://YOUR-CLOUD-RUN-URL.run.app
          workload_identity_provider: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
          service_account: your-invoker@YOUR_PROJECT.iam.gserviceaccount.com
          repository: ${{ github.repository }}
          branch: ${{ github.ref_name }}

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
