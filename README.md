# Artistic QR Code Generator — MVP

> **Status:** Product charter and contract freeze in progress.
> **Scope:** Static artistic QR creation, validation, export, and guest purchase.
> **Excluded:** Dynamic QR, custom domains, analytics dashboard, API platform.

## Quick Links
- [Product Charter](docs/charter.md)
- [Contract Pack](docs/contracts/)
- [Dependency DAG](docs/program/dag.md)
- [Integration Sequencer](docs/program/merge-order.md)
- [Agent Handoffs](docs/program/handoffs/)

## Repo Rules
- `main` is protected. Only the integrator (QR Product Architect) merges.
- Each agent owns specific directories. See `CODEOWNERS`.
- Contract changes require version bump + integrator approval.
