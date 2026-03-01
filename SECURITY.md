# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x (latest) | ✅ Active security fixes |
| < 1.0 | ❌ No longer supported |

## Reporting a Vulnerability

**Please do NOT open a public GitHub Issue for security vulnerabilities.**

### Option 1 — GitHub Private Vulnerability Reporting (Preferred)
Use GitHub's built-in private reporting:
[Report a vulnerability](../../security/advisories/new)

### Option 2 — Email
Send details to: **security@preskool.com**

Please include:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested fix (optional)

### What to Expect
| Timeline | Action |
|----------|--------|
| **24 hours** | Acknowledgement of your report |
| **72 hours** | Initial severity assessment |
| **7 days** | Patch or mitigation plan shared with reporter |
| **30 days** | Public disclosure (coordinated with reporter) |

We follow responsible disclosure. Critical fixes are patched and released before public disclosure.

## Security Best Practices for Contributors

- Never commit secrets, tokens, or credentials to the repository
- All sensitive config must use environment variables (see `.env.example`)
- Run `bandit` (Python) and `npm audit` (JS) before submitting a PR
- Follow OWASP Top 10 guidelines for any new endpoints
- All authentication changes must be reviewed by a maintainer

## Scope

The following are **in scope** for security reports:
- Authentication & authorization bypasses
- SQL injection / XSS / CSRF in API endpoints
- Sensitive data exposure
- Broken access control between tenants
- Remote code execution

The following are **out of scope**:
- Vulnerabilities in third-party services we do not control
- Issues requiring physical access to the server
- Social engineering attacks
- Issues in test/development environments only

## Hall of Fame

We appreciate responsible disclosure and will acknowledge reporters (with permission) in our release notes.
