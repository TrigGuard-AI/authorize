# TrigGuard Authorization

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-TrigGuard_Authorization-blue?logo=github)](https://github.com/marketplace/actions/trigguard-authorization)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Gate deploys, migrations, and other irreversible CI steps** with TrigGuard. This action calls your TrigGuard execution gateway, receives a **signed cryptographic receipt**, and **verifies the signature on the runner** — so a compromised server cannot forge approval.

```yaml
- uses: TrigGuard-AI/authorize@v1
  with:
    surface: deploy.release
    gateway_url: https://api.trigguardai.com
    repository: ${{ github.repository }}
```

[Install from GitHub Marketplace](https://github.com/marketplace/actions/trigguard-authorization) · [Documentation](https://trigguardai.com) · [Report a bug](https://github.com/TrigGuard-AI/authorize/issues)

---

## How it works

1. **Authorize** — `POST /execute` with your execution surface (e.g. `deploy.release`).
2. **Receipt** — Gateway returns a signed receipt bound to the decision.
3. **Verify locally** — Action fetches `/.well-known/trigguard/keys.json` and verifies the signature before your workflow continues.
4. **Fail closed** — Invalid receipts or non-`PERMIT` decisions fail the job (unless you use observe mode during rollout).

---

## Quick start

```yaml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  id-token: write   # required for GCP OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: TrigGuard authorization
        uses: TrigGuard-AI/authorize@v1
        with:
          surface: deploy.release
          gateway_url: https://api.trigguardai.com
          workload_identity_provider: ${{ secrets.TRIGGUARD_WIF_PROVIDER }}
          service_account: ${{ secrets.TRIGGUARD_SERVICE_ACCOUNT }}
          repository: ${{ github.repository }}
          branch: ${{ github.ref_name }}

      - name: Deploy
        run: ./deploy.sh
```

---

## Authentication

### Recommended: GCP Workload Identity Federation (OIDC)

No long-lived secrets in GitHub. Grant your GitHub repo access to a GCP service account with `roles/run.invoker` on the gateway, then pass:

| Input | Description |
|-------|-------------|
| `workload_identity_provider` | WIF provider resource (`projects/.../providers/...`) |
| `service_account` | Invoker service account email |

Your workflow job needs `permissions: id-token: write`.

Setup guide: [TrigGuard docs — GitHub Actions](https://trigguardai.com/docs/integrations/github-actions) (contact support if you need a walkthrough).

### Alternative: API key

```yaml
with:
  gateway_url: https://api.trigguardai.com
  authToken: ${{ secrets.TRIGGUARD_API_KEY }}
```

Prefer OIDC for production CI.

---

## Observe mode (policy rollout)

Evaluate policy **without blocking** the pipeline while you tune rules:

```yaml
- uses: TrigGuard-AI/authorize@v1
  with:
    surface: deploy.release
    gateway_url: https://api.trigguardai.com
    execution_mode: observe
    repository: ${{ github.repository }}
```

Check output **`would-decision`** — that is what enforcement would have done.

---

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `surface` | **Yes** | Execution surface (e.g. `deploy.release`, `database.migrate`). |
| `gateway_url` | One of* | TrigGuard gateway base URL. |
| `endpoint` | One of* | Alias for `gateway_url`. |
| `authorityUrl` | One of* | Alias for `gateway_url`. |
| `workload_identity_provider` | OIDC | GCP WIF provider resource id. |
| `service_account` | OIDC | GCP service account with gateway invoker access. |
| `authToken` | No | Bearer token (legacy; prefer OIDC). |
| `repository` | No | `${{ github.repository }}` — for repo allowlist policies. |
| `branch` | No | `${{ github.ref_name }}` — optional context for policy. |
| `execution_mode` | No | `enforce` (default) or `observe`. |
| `actor_id` / `actorId` | No | Actor id (default: `github-actions`). |

\*Provide one of `gateway_url`, `endpoint`, or `authorityUrl`.

## Outputs

| Output | Description |
|--------|-------------|
| `decision` | Effective decision (`PERMIT` when the step succeeds). |
| `would-decision` | Policy truth in observe mode (`PERMIT`, `DENY`, `SILENCE`). |
| `execution-id` | Execution / receipt id. |
| `execution-token` | TG-EAT JWT when issued (enforce mode). |
| `receipt` | Full signed receipt JSON (for audit artifacts). |

---

## Security

- Receipts are verified **on the runner** using the gateway public key — not trust-on-first-use over TLS alone.
- See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## Support

- **Issues:** [github.com/TrigGuard-AI/authorize/issues](https://github.com/TrigGuard-AI/authorize/issues)
- **Product:** [trigguardai.com](https://trigguardai.com)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)

---

## License

[MIT](LICENSE) © TrigGuard-AI
