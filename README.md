# ParadeOne

ParadeOne is a parade registration and live-operations platform. It brings organizer setup, participant management, staging, check-in, communications, and parade-day coordination into one operational system.

Our guiding principle is: **Function first, then fashion.**

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase for authentication and PostgreSQL data
- Mapbox GL for operational maps
- Vercel for deployment

## Functional areas

- **Authentication** — Login, signup, callback handling, protected routes, and session-aware server clients.
- **Organizations and role-based access** — Organization membership and owner, admin, staff, and volunteer roles.
- **Parade creation** — Organization-scoped event creation and parade configuration.
- **Entries and lineup** — Participant records, parade numbers, assignments, ordering, and lineup management.
- **Staging** — GPS-backed staging spots, sections, reserved space, assignments, and operational map views.
- **Participant GPS and check-in** — Participant access links, location sharing, geofence-aware check-in, and push-off estimates.
- **Mission Control** — Live map, unit status, operational queue, push-off controls, and command-room views.
- **Communications** — Mission Control channels, participant messaging, and sender identity foundations.
- **SMS/privacy foundations** — SMS consent, inbound-message handling, terms, privacy pages, and participant-access safeguards.

## Local setup

1. Install Node.js and npm. Use a current Node.js release supported by Next.js 16.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` in the repository root and add the required variables listed below.
4. Create or select a Supabase project and apply every SQL file in `database/migrations` in numeric order.
5. Add the local application URL to the allowed authentication redirect URLs in Supabase.
6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

Useful verification commands:

```bash
npm run lint
npm run build
```

## Environment variables

Do not commit `.env.local` or real credentials. The application currently requires:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
```

Set the same names in the Vercel project environment for deployed builds. The `NEXT_PUBLIC_` variables are exposed to browser code, so they must never contain privileged Supabase service-role credentials or other secrets.

## Project structure

- `app/` — Next.js App Router pages, layouts, route handlers, and server actions.
- `components/` — Reusable client and server UI organized by product area.
- `lib/` — Authentication, Supabase clients, access checks, data access, and domain helpers.
- `database/migrations/` — Incremental PostgreSQL schema migrations.
- `docs/` — Product, architecture, and database-design notes.
- `public/` — Static assets served by Next.js.
- `middleware.ts` — Authentication gate for protected application routes.

## Database migrations

Migration filenames begin with a numeric prefix. Apply migrations in ascending numeric order because later migrations depend on tables and columns introduced earlier. Do not edit an already-applied migration to change a shared environment; add a new migration with the next number instead.

Before deploying code that depends on a schema change, apply the corresponding migrations to the target Supabase database.

## Access control for operational writes

Pages may hide controls, but UI visibility is not authorization. Every server action and write-capable route handler must authenticate the current user and authorize the operation on the server.

The established pattern is:

1. Resolve the target event or record from the database.
2. Determine its owning organization.
3. Call `requireOrganizationRole` with the roles allowed to perform the operation.
4. Scope the mutation by the relevant organization, event, and record identifiers.
5. Check and surface database errors before redirecting or returning success.

Use `requireAccessibleOrganizationBySlug` and `requireAccessibleEventContext` for read-page context. Never trust organization IDs, event IDs, roles, or other authorization context supplied by hidden fields or client JSON without verifying them against the database.

## Git workflow

The standard workflow is:

1. Start from an up-to-date `main` branch.
2. Create a focused feature or fix branch.
3. Make a small, scoped change and avoid mixing unrelated work.
4. Run `npm run lint` and `npm run build` before publishing.
5. Review the diff and commit with a concise, imperative message.
6. Push the branch and open a pull request into `main`.
7. Address review and CI feedback, then merge after approval.

Do not commit `.env.local`, credentials, generated build output, or unrelated local changes.

## Camp Nackte waiver module

The Camp Nackte waiver module lives in this repository, but it is separate from the ParadeOne operational domain. Its waiver forms, submissions, and related data flows should remain isolated from parade registration, staging, participant operations, and Mission Control unless an explicit integration is designed and approved.

## Product north star

“Does this reduce radios, paper lists, or manual decisions on parade day?”
