# Nexora Supabase workspace

This directory is the versioned, local-first source of truth for the Nexora database.

## Layout

- `config.toml`: local Supabase CLI configuration.
- `migrations/`: immutable, timestamped migrations applied in lexical order.
- `tests/`: transactional pgTAP tests for schema, constraints, and RLS.
- `phase*.sql`: legacy reference scripts only. The CLI does not apply them.

No seed is enabled. Test fixtures are synthetic and are rolled back after every SQL test.

## Prerequisites

- Node.js 20 or later.
- A Docker-compatible container runtime such as Docker Desktop, OrbStack, Podman, or Rancher Desktop.

Install the exact dependency versions with:

```sh
npm ci
```

## Local workflow

```sh
npm run supabase:start
npm run supabase:reset
npm run supabase:lint
npm run test:db
npm run supabase:stop
```

The reset, lint, and test commands explicitly target the local stack. A database reset recreates the
local database from `migrations/` before running tests.

## Migration rules

- Use UTC timestamps: `YYYYMMDDHHMMSS_description.sql`.
- Never edit a migration after it has been applied to a shared environment; add a new migration.
- Keep each migration focused on one bounded domain.
- Use schema-qualified object names and explicit grants.
- Enable RLS and add its tests in the same task as every client-accessible table.
- Do not add personal data, production identifiers, project references, or secrets.

## Remote safety gate

Do not run `supabase link`, `supabase db push`, commands with `--linked`, or any GitHub/Supabase
integration until the local migration chain and RLS tests have been reviewed and explicitly approved.
