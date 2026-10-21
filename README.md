# Orbit / Task Organizer

A React workspace for planning meaningful work. Rebuilt from the original setup-script prototype into a runnable full-stack application by Ikshwaku Vanani.

## Hosted workspace

https://orbit-iv-vanani.fabled-crumb-5773.chatgpt.site

The deployed `hosted/` adapter runs on Workers and D1 with ChatGPT sign-in. It is owner-private. This Express application remains available for local or self-hosted SQLite/MySQL use with its own account system. The two databases are separate. See `hosted/README.md` for the deployed architecture.

## Run locally

Requires Node 22.13+ (Node 24 recommended). No database installation is needed for the default SQLite mode.

```sh
cp .env.example .env
npm ci
npm run build
npm start
```

Open http://localhost:4000 and create an account. New workspaces start empty. `npm run dev` watches backend changes; run `npm run build` after frontend changes. The Express server serves the built React application and same-origin API.

## What works

- Register, sign in, and sign out with private, account-scoped tasks.
- Create, edit, delete, and move tasks between planned, in progress, and completed.
- Projects, priorities, due dates, notes, search, and board/list views.
- Completion metrics, project insights, and a pause/reset focus timer.
- SQLite for a self-contained local run; pooled MySQL for deployment.
- Validation, prepared statements, scrypt password hashes, expiring opaque sessions, HttpOnly cookies, origin checks, rate-limited authentication, and generic server errors.

The focus timer runs only while the tab is open. This is a portfolio application, with no email verification or password recovery service configured.

## MySQL / Docker

Set `DB_PASS` and `DB_ROOT_PASS` to new values in `.env`, then `docker compose up --build`. MySQL tables are created at startup; the database itself must already exist when connecting to an external instance. Docker Compose creates it. MySQL data is stored in a named volume. The Compose configuration serves HTTP locally, so its cookie mode is development. For internet hosting, terminate HTTPS, set `NODE_ENV=production`, and set `APP_ORIGIN` to the exact HTTPS origin. Do not expose MySQL to the internet.

The old script did not produce a checked-in application. Its generated `tasks` table is not migrated automatically; export any existing data before adopting this account-scoped schema.

## Verify

```sh
npm test
npm run build
```

The API integration test verifies authorization boundaries, invalid data, cross-origin writes, complete task lifecycle, login, and logout. CI runs it against SQLite and MySQL 8.4. Database files, dependencies, and environment secrets are ignored.
