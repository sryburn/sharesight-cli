# sharesight-cli

Unofficial CLI client for [Sharesight](https://sharesight.com), designed with AI agent workflows in mind.

## Commands

- `sharesight auth login`
- `sharesight auth status`
- `sharesight auth logout`
- `sharesight list portfolios`
- `sharesight list groupings`
- `sharesight defaults set [--portfolio <id-or-name>] [--grouping <grouping-or-custom-name-or-id>] [--include-sales|--exclude-sales] [--format <json|jsonl>]`
- `sharesight defaults show` 
- `sharesight get performance [--portfolio <id-or-name>] [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD] [--include-sales|--exclude-sales] [--grouping <grouping-or-custom-name-or-id>] [--format <json|jsonl>]`
- `sharesight get trades [--portfolio <id-or-name>] [--holding <symbol[.market]>] [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD] [--unique-identifier <id>] [--format <json|jsonl>]`
- `sharesight get payouts [--portfolio <id-or-name>] [--holding <symbol[.market]>] [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD] [--use-date <paid_on|ex_date>] [--format <json|jsonl>]`

## Installation

Install globally (recommended for regular use):

```bash
npm install -g sharesight-cli
```

Run without installing globally:

```bash
npx sharesight-cli --help
```

## Development

For local development:

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

Paying Sharesight subscribers can contact Sharesight support and ask them to provision an API account for personal use.

You can provide credentials in two ways:

1. Recommended for interactive use:
  - `sharesight auth login`
  - Credentials are stored in OS secure storage when available (`secret-tool` on Linux, `security` on macOS).
  - If secure storage is unavailable, the CLI falls back to a local credentials file with restricted permissions and prints a warning.
2. Recommended for automation/CI:
  - Set `SHARESIGHT_CLIENT_ID` and `SHARESIGHT_CLIENT_SECRET`.

Use `sharesight auth status` to see which credential backend is currently active.

## Defaults

Set defaults once, then run report commands without repeating flags.

- Show current defaults:
  - `sharesight defaults show`
- Set default portfolio and grouping together:
  - `sharesight defaults set --portfolio "Main Portfolio" --grouping market`
- Set only one default:
  - `sharesight defaults set --portfolio 123`
  - `sharesight defaults set --grouping "Long Term"`
  - `sharesight defaults set --include-sales`
  - `sharesight defaults set --exclude-sales`
  - `sharesight defaults set --format jsonl`

## Lists

- Portfolios:
  - `sharesight list portfolios`
- Groupings (built-in + custom):
  - `sharesight list groupings`

## Get performance

```bash
sharesight get performance --format json
sharesight get performance --portfolio 123 --format json
sharesight get performance --start-date 2024-01-01 --end-date 2024-12-31 --include-sales
sharesight get performance --exclude-sales
sharesight get performance --grouping market
sharesight get performance --grouping 123
sharesight get performance --grouping "Long Term"
```

- If `--portfolio` is omitted, `get performance` uses the default portfolio from `defaults set`.
- If `--grouping` is omitted, `get performance` uses the default grouping from `defaults set` or otherwise falls back to the Sharesight default.
- If `--include-sales` / `--exclude-sales` is omitted, `get performance` uses the sales default from `defaults set` or otherwise falls back to the Sharesight default.
- If `--format` is omitted, `get performance` uses the output format default from `defaults set` (or `json` if unset).
- `--grouping` accepts:
  - standard grouping names (`market`, `currency`, etc.)
  - custom grouping ID (e.g. `123`)
  - custom grouping exact name (e.g. `"Long Term"`)

## Get trades

```bash
sharesight get trades --format json
sharesight get trades --portfolio 123 --start-date 2024-01-01 --end-date 2024-12-31
sharesight get trades --holding AAPL
sharesight get trades --holding AAPL.NASDAQ
sharesight get trades --unique-identifier broker-confirmation-123
```

- If `--portfolio` is omitted, `get trades` uses the default portfolio from `defaults set`.
- If `--holding` is omitted, trades are returned for the selected portfolio.
- If `--holding` is provided, the CLI resolves it against the selected portfolio's holdings and retrieves holding-level trades.
- `--holding` accepts an unqualified symbol (e.g. `AAPL`) only when it uniquely identifies a holding in the selected portfolio.
- Use `symbol.market` (e.g. `AAPL.NASDAQ`) when a symbol is listed in more than one market.
- If `--format` is omitted, `get trades` uses the output format default from `defaults set` (or `json` if unset).

## Get payouts

```bash
sharesight get payouts --format json
sharesight get payouts --portfolio 123 --start-date 2024-01-01 --end-date 2024-12-31
sharesight get payouts --holding VAS.ASX
sharesight get payouts --use-date ex_date
```

- If `--portfolio` is omitted, `get payouts` uses the default portfolio from `defaults set`.
- If `--holding` is omitted, payouts are returned for the selected portfolio.
- If `--holding` is provided, the CLI resolves it against the selected portfolio's holdings and retrieves holding-level payouts.
- `--holding` accepts an unqualified symbol (e.g. `VAS`) only when it uniquely identifies a holding in the selected portfolio.
- Use `symbol.market` (e.g. `VAS.ASX`) when a symbol is listed in more than one market.
- `--use-date` accepts `paid_on` or `ex_date`.
- If `--format` is omitted, `get payouts` uses the output format default from `defaults set` (or `json` if unset).

Global options:

- `--base-url` (default `https://api.sharesight.com`)
- `--timeout-ms` (default `30000`)

## Output formats

- `json` (default): pretty JSON output (recommended for AI agents)
- `jsonl`: one JSON record per line (best for pipelines)

## Development checks

```bash
npm run lint
npm run test
npm run build
```
