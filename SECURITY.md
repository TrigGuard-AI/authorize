# TrigGuard Security Policy

The security of TrigGuard is a top priority.  
We appreciate responsible security research and encourage coordinated vulnerability disclosure.

This document explains how to report security issues and how we handle them.

---

# Supported Versions

Only the most recent release of TrigGuard components is supported with security updates.

| Version | Supported |
|--------|-----------|
| v1.x   | ✓ |
| < v1   | ✗ |

Security fixes will be released as soon as possible once a vulnerability is verified.

---

# Reporting a Vulnerability

If you discover a security vulnerability in TrigGuard, please report it **privately**.

DO NOT open a public GitHub issue.

Instead use one of the following:

1. **GitHub Private Vulnerability Reporting**
2. Email: **security@trigguardai.com**

Include the following information:

- description of the vulnerability
- steps to reproduce
- affected components
- potential impact
- proof of concept if available

This helps us reproduce and resolve the issue faster.

---

# Responsible Disclosure

We follow **coordinated vulnerability disclosure**.

Process:

1. Vulnerability is reported privately
2. We confirm and reproduce the issue
3. A patch is developed
4. Security advisory is published
5. Credit is given to the reporter (if desired)

Please allow reasonable time for remediation before public disclosure.

---

# Response Timeline

Target response times:

| Stage | Target |
|------|--------|
| Initial response | within 72 hours |
| Triage decision | within 7 days |
| Patch release | depends on severity |

Critical vulnerabilities will be prioritized immediately.

---

# Scope

This policy applies to the following TrigGuard components:

- TrigGuard Execution Gateway
- TrigGuard GitHub Action (`authorize`)
- TrigGuard SDKs
- TrigGuard protocol implementations

Infrastructure configuration and third-party dependencies may be handled through their respective security processes.

---

# Safe Harbor

We will not pursue legal action against researchers who:

- follow responsible disclosure
- avoid privacy violations
- avoid disrupting services
- avoid accessing unrelated data

Security research conducted in good faith is welcome.

---

# Security Advisories

Confirmed vulnerabilities will be published via:

- GitHub Security Advisories
- release notes
- CVE if applicable

---

# Thank You

We appreciate the security community helping keep TrigGuard and its users safe.
