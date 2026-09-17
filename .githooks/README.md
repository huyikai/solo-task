# Git Hooks

Enable the TDD pre-push hook (Constitution Principle VI):

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-push
```

## pre-push

- Rejects force-push to `main` (plan.md Q1)
- Rejects any push where a commit touches production code under a
  conventional-commit scope without an earlier commit in the same push
  (same scope) that touched a test file
- Test file patterns: `__tests__/`, `tests/`, `*.test.[jt]sx?`,
  `*.spec.[jt]sx?`, `*_test.rs`
- Exempt paths (no test predecessor required): `*.md`, `.github/`,
  `.githooks/`, `scripts/`
