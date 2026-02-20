# Contributing to PreSkool ERP

Thank you for contributing to PreSkool ERP! This document outlines how to contribute code, report issues, and get your pull request merged.

---

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions. We are committed to maintaining a welcoming community.

---

## Reporting Issues

Before opening an issue:
1. Search existing issues to avoid duplicates
2. Check the FAQ and docs in `docs/`

**Issue Template:**
```
### Description
[Clear description of the bug or feature request]

### Steps to Reproduce (bugs only)
1. Go to...
2. Click...
3. See error...

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Environment
- OS: macOS / Windows / Linux
- Browser: Chrome 120
- Backend version: 1.0.0
```

---

## Development Workflow

1. **Fork** the repository (external contributors)
2. **Branch** from `main`: `git checkout -b feature/my-feature`
3. **Develop** following the [code conventions](ONBOARDING.md#code-conventions)
4. **Test** your changes (unit + integration)
5. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/)
6. **Push** and open a Pull Request / Merge Request

---

## Pull Request Requirements

Every PR must:

- [ ] Reference the related issue: `Closes #123`
- [ ] Pass all existing tests (`pytest` and `npm test`)
- [ ] Include new tests for new functionality
- [ ] Have no linting errors (`black`, `flake8`, `eslint`)
- [ ] Include documentation updates if the API surface changes
- [ ] Have a clear PR description explaining _what_ and _why_

---

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<name>` | `feature/bulk-student-import` |
| Bug fix | `fix/<name>` | `fix/attendance-timezone-bug` |
| Hotfix | `hotfix/<name>` | `hotfix/payment-webhook-failure` |
| Docs | `docs/<name>` | `docs/api-reference-update` |
| Refactor | `refactor/<name>` | `refactor/fee-service-cleanup` |

---

## Test Requirements

### Backend
- New API endpoints: add tests in `app/tests/`
- New services: add unit tests with mocked DB
- Minimum coverage: **80%** (enforced in CI)

### Frontend
- New Redux slices: test thunks and reducers
- New page components: basic render test

```bash
# Run backend tests with coverage
cd backend && pytest --cov=app --cov-fail-under=80

# Run frontend tests
cd frontend && npm test
```

---

## Code Review Process

1. Assign 1-2 reviewers from the team
2. Address all review comments before merge
3. Maintainer performs final approval and squash-merge to `main`
4. CI/CD automatically deploys to staging after merge

---

## Release Process

PreSkool ERP uses **semantic versioning** (`MAJOR.MINOR.PATCH`):

- `MAJOR` — breaking API changes
- `MINOR` — new features (backward compatible)
- `PATCH` — bug fixes

Releases are tagged from `main` after milestone completion:
```bash
git tag -a v1.2.0 -m "Release v1.2.0 — Library module improvements"
git push origin v1.2.0
```
