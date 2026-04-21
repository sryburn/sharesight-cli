# sharesight-cli

CLI wrapper for a focused subset of the Sharesight API, designed with AI agent workflows in mind.

## MVP commands

- `sharesight auth login`
- `sharesight auth status`
- `sharesight auth logout`
- `sharesight group list`
- `sharesight group use <grouping-or-custom-name-or-id>`
- `sharesight group show`
- `sharesight portfolio list`
- `sharesight portfolio show`
- `sharesight portfolio use <id-or-name>`
- `sharesight performance [--portfolio <id-or-name>]`

## Installation

```bash
npm install
npm run build
```

Run during development:

```bash
npm run dev -- --help
```

## Authentication

Each user uses their own Sharesight OAuth `client_id` and `client_secret`.

You can provide credentials in two ways:

1. Recommended for interactive use:
  - `sharesight auth login`
  - Credentials are stored in OS secure storage when available (`secret-tool` on Linux, `security` on macOS).
  - If secure storage is unavailable, the CLI falls back to a local credentials file with restricted permissions and prints a warning.
2. Recommended for automation/CI:
  - Set `SHARESIGHT_CLIENT_ID` and `SHARESIGHT_CLIENT_SECRET`.

Use `sharesight auth status` to see which credential backend is currently active.

## Portfolio ergonomics

- Discover portfolios: `sharesight portfolio list`
- Show current default: `sharesight portfolio show`
- Set a default once: `sharesight portfolio use "My Portfolio"`
- After default is set, `sharesight performance` can be called without `--portfolio`.
- `--portfolio` accepts exact name or ID.
- For compatibility, `portfolio use` accepts either positional value or `--portfolio`.

## Performance command

```bash
sharesight performance --portfolio 123 --format json
sharesight performance --portfolio "Main Portfolio" --start-date 2024-01-01 --end-date 2024-12-31 --include-sales
sharesight performance --grouping market
sharesight performance --grouping 123
sharesight performance --grouping "Long Term"
sharesight performance --view raw
```

If `--grouping` is omitted, the CLI uses the default set by `sharesight group use`.

Use `sharesight group list` to view valid default groups and discover custom group names/IDs.

`performance` defaults to `--view table` (AI-friendly grouped rows + totals). Use `--view raw` for the full API payload.

Global options:

- `--base-url` (default `https://api.sharesight.com`)
- `--timeout-ms` (default `30000`)
- `--verbose`

## Output formats

- `json` (default): pretty JSON output (recommended for AI agents)
- `jsonl`: one JSON record per line (best for pipelines)

## Development checks

```bash
npm run lint
npm run test
npm run build
```

