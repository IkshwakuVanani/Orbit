# Orbit

Designed and built by Ikshwaku Vanani. A complete rebuild of `task-organizer-app` with a responsive React interface and persistent server-side data.

## Live workspace

https://orbit-iv-vanani.fabled-crumb-5773.chatgpt.site

The deployment is owner-private and requires ChatGPT sign-in. It is not publicly accessible to arbitrary GitHub visitors. Each API request scopes reads and writes to the trusted, platform-injected user ID.

## Features

Board/list task planning, projects, search, priorities, deadlines, completion insights, and a 25-minute focus timer.

## Architecture

React with Vinext on Cloudflare Workers, SQL migrations through Drizzle, and Cloudflare D1 persistence. The original unfinished source remains in Git history. The React/Express/SQLite/MySQL version remains in the parent directory; this folder is its hosted adapter.

Mutations validate JSON, reject cross-origin requests, use bound SQL parameters, and require authenticated identity. No API keys or passwords are shipped in source. Sample data is loaded only after an explicit action and only into an empty workspace.

## Local setup

Requires Node 22.13+ and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run build
```

Apply each generated SQL migration once to a local D1 database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_adorable_karma.sql
pnpm run dev
```

The local preview uses the starter's loopback-only simulated ChatGPT sign-in at `/signin-with-chatgpt?return_to=/` in the portable profile. Production identity is supplied by the hosting platform. Direct unauthenticated API requests return 401. Managed preview does not simulate sign-in.

## Deployment

The tracked `.openai/hosting.json` retains the deployment identity and the `DB` binding. Source is versioned and deployed through the Sites source workflow. Hosting applies the checked-in `drizzle/` migrations before publishing the Worker. Preserve applied migrations; append migrations for later schema changes. Changes pushed to GitHub do not independently update the hosted version: republish using the same Site identity.

The starter scripts select the managed or portable execution profile. Runtime state, dependency folders, generated builds, and credentials are ignored.

## Verification and scope

`pnpm test` exercises the actual request handlers against a transactional SQLite-backed D1 test adapter using the generated migrations. Production builds were also checked. These tests do not replace a live D1 integration suite. Browser inspection was blocked by the environment URL policy; no successful screenshot QA is claimed.

The focus timer runs while the tab is open. The hosted adapter uses ChatGPT identity; the separate Express application has its own account system. Data is not synchronized between the two.
