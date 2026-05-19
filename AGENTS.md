- do not proactively run tests, lint, typecheck, format, or similar verification unless the user asks for it; the pre-commit hook runs these automatically before commits
- pause frequently to make atomic git commits as you work; use conventional commit standards
- preserve package boundaries: browser code may import `@bankops/contracts`, but not server-only packages; update `dependency-cruiser.config.cjs` only when the architecture changes
- when adding environment variables, update `.env.example` and docs so `pnpm test:env` stays meaningful
- add intentional BankOps or tooling vocabulary to `cspell.json` instead of weakening spelling checks

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `perich/atlas`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with root `CONTEXT.md` and root `docs/adr/`. See
`docs/agents/domain.md`.
