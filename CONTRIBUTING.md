# Contributing

Thank you for helping improve TrigGuard Authorization.

## Before you open a PR

1. Search [existing issues](https://github.com/TrigGuard-AI/authorize/issues) — avoid duplicates.
2. For **security** issues, follow [SECURITY.md](SECURITY.md) — do not file public issues.
3. Keep changes focused on this action (`action.yml`, `index.js`, `verify.js`, `oidc-gcp.js`).

## Development

This repository is synced from the TrigGuard monorepo (`trigguard-github-action/`). For substantial changes:

1. Open an issue describing the change.
2. If accepted, implement in the monorepo and run `scripts/distribution/sync-authorize-action.sh`, or PR directly here for doc-only fixes.

```bash
npm ci
npm test   # if tests are present
```

## Pull requests

- Describe the user-visible behavior change.
- Update README if inputs/outputs change.
- Sign commits if your org requires it.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
