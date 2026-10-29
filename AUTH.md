# PH Sports authentication and deployment

The public homepage is available without signing in. Login and registration use email and password. Successful authentication creates a random server-side session in D1 and sends an HttpOnly cookie; JavaScript never receives or stores the session token. Passwords use independently salted scrypt (N=16384, r=8, p=5); the database contains password hashes and SHA-256 session verifiers only.

Sessions expire after seven days, or after 24 hours without activity. Every API request rechecks the stored session and current account permissions. Sign-out revokes the server session. Auth responses and private data use `Cache-Control: no-store`. Mutations require the application request header and reject cross-site origins. Login and registration are rate limited by account and Cloudflare-provided client IP.

Public signup creates an incomplete student account. Profile setup can submit a teacher application; only administrator approval grants teacher access. The application never creates an administrator based on an email address. Existing database users cannot be claimed through public registration. They need an operator to provision credentials.

## Database setup

Install Wrangler from its official package if it is not already available. Both a new database and an existing database with the original `schema.sql` use the same migration sequence:

```sh
npm run db:migrate:local
npm run build
npm run dev:full
```

Open `http://localhost:8788`. For Vite hot reloading, keep the full server running and run `npm run dev` in another terminal; Vite proxies `/api` to the local full server.

The migrations create the original tables when necessary, add authentication tables, and add/backfill application fields without dropping existing tables. `schema.sql` is the current entity-schema snapshot for tests and inspection; do not execute that snapshot before applying the migration chain on a new database. Wrangler records applied migrations so subsequent migration runs do not repeat `ALTER TABLE` operations.

Before a production release, back up the D1 database and apply the migrations to that deployment's database:

```sh
npm run db:migrate:remote
npm run build
wrangler pages deploy dist --project-name ph-sports
```

Use the configured `DB` D1 binding in `wrangler.toml`. Production requires HTTPS and a Workers/Pages runtime with Node compatibility, including native `node:crypto.scrypt`. Keep a CPU budget sufficient for the password hash (measure on the deployment; the smallest free CPU allowance may be insufficient). Do not weaken the password hash to fit a smaller budget. This change does not require an email provider or an external identity service.

The normalized-email unique index intentionally fails if legacy data has multiple users whose emails differ only in case. Resolve those duplicate accounts before applying the authentication migration.

## First administrator and existing accounts

There is no default administrator password. Provision a new administrator, or set credentials for an existing account, from an operator's interactive terminal:

```sh
npm run account:provision -- --local --email YOUR_EMAIL --name 'Your Name' --role admin
```

Use `--remote` instead of `--local` for the production database. The script asks for confirmation of the destination email before changing a remote account. It reads the password twice with terminal echo disabled; never place a password in command arguments. Only a salted hash is sent to D1. Password resets revoke existing sessions.

For an existing student or teacher, omit `--role` to preserve their role and profile state:

```sh
npm run account:provision -- --remote --email EXISTING_EMAIL
```

The script is an operator tool, not a public HTTP endpoint. Running it requires access to the D1 database through Wrangler. `--role admin` is an explicit privilege change; never expose this script or database credentials to ordinary users. The old demo administrator address is reserved from public signup and has no automatically assigned credentials.

## Data permissions

- Guests: homepage, login and registration only; business APIs reject requests without a valid cookie session.
- Students: their own training records and profile; membership in their sports; team announcements; venue availability and their own booking requests. Other bookers' identities and request details are redacted.
- Approved teachers: training and team data for the sport they coach; announcements and booking review for that sport.
- Administrators: account directories and management features, including teacher review. Generic profile updates cannot grant administrator rights.
- Pending or rejected teachers and incomplete profiles cannot use business functions. Onboarding and their own application status remain accessible.
- Team leaderboards use a separate summary endpoint, so other students' private training notes and raw measurements are never sent to a student's browser.

Email ownership is not verified by this self-contained signup flow. If school-only enrollment or verified addresses are required, integrate the school's identity provider or email verification before allowing public enrollment. Password recovery is currently handled by the operator provisioning command.

## Verification

```sh
npm run check:auth
npm run check:server-auth
npm run check:access
npm run build
```

Backend checks execute production handlers and SQL against real SQLite, including rollback, session expiry/revocation, invalid tokens, throttling, ownership and role enforcement. A local Wrangler check also verifies the Cloudflare runtime and D1 binding. Test scripts require Node 22.13 or newer for `node:sqlite`.

Implementation references: [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [Cloudflare Node crypto support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/).
