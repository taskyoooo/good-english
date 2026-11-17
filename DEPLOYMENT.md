# Good English deployment

## Public demo

`npm ci` then `npm run build:demo` produces a static demo for GitHub Pages at `/good-english/`.

The demo loads bundled learning materials and supports word/sentence/mixed practice, answer feedback, browser speech synthesis, mistakes and session statistics. It does not expose a production authentication backend. The latest 120 completed attempts are stored in the current browser. There is no cloud sync, SMS login or Excel import. Speech availability depends on the device/browser. The demo must not be represented as a production multiuser service.

The Pages workflow builds the demo. In GitHub Settings > Pages, select GitHub Actions. The expected URL is https://taskyoooo.github.io/good-english/; it is only live after Pages reports successful deployment.

## Full backend

The original Express/PostgreSQL backend remains in server/. Set DATABASE_URL and CORS_ORIGIN privately, deploy the API, build without VITE_DEMO_MODE and supply VITE_API_BASE_URL. Never commit real database credentials.

Every public registration creates a student. To grant an administrator role, the operator must verify the intended account and update that account by ID directly in the private database. There is no email allowlist or first-user takeover. Existing administrators are not silently changed by this patch; audit any existing database before reuse.

## Validation

`npm test` exercises the real registration HTTP handler with an isolated database substitute, covering first/subsequent registrations, forged roles, duplicate email and invalid inputs. It does not constitute a PostgreSQL or hosted backend integration test.

`npm run build:demo` checks frontend types and creates the static production bundle. The public demo requires no paid backend resources.
