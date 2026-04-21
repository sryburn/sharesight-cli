# Sharesight CLI AI Agent Instructions

## Project Scope

- This repository is an AI-first CLI wrapper for Sharesight API endpoints.

## Runtime and Commands

- Use latest Node LTS for development and validation.
- Preferred validation command is `npm run check` (lint + tests + build).

## CLI Functionality

- Supported output formats are `json` (default) and `jsonl`.
- `auth login` is provided for ease of use
- Credential storage strategy is secure-store first with local file fallback.
- The CLI sets DNS result order to `ipv4first` at startup to improve reliability on IPv4-only networks.

## Code Change Guidelines

- Maintain backwards compatability / no breaking changes without express permission from the user.
- Keep command UX explicit and predictable.
- Never log secrets or print credential values.
- Update tests and README.md when behavior changes.
- Perform regular git commits but always ask the user for permission first.

## Relevant Documentation

- [Sharesight API V3 Reference](https://portfolio.sharesight.com/api/3/doc/index.html)