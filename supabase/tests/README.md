# Nexora database tests

Database tests live in this directory and are executed locally with pgTAP.

## Commands

```sh
npm run supabase:start
npm run supabase:reset
npm run supabase:lint
npm run test:db
npm run supabase:stop
```

The reset, lint, and test scripts explicitly target the local Supabase stack.
Do not add `--linked` to these scripts.

## Conventions

- Name tests in migration order: `0001_foundation.test.sql`, then one file per domain.
- Wrap every test file in `begin` / `rollback` so fixtures never persist.
- Use only synthetic identities and `.invalid` email addresses.
- Test owner access, cross-user denial, anonymous denial, constraints, and cascades.
- Do not put production data, personal data, project references, or secrets in SQL tests.
