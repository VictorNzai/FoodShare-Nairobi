# FoodShare: migration plan to Next.js and TypeScript

Written 4 October 2026. Companion to `CODE_REVIEW.md`, which lists the problems
this migration is meant to close.

## 1. Summary

- **What:** replace the static HTML frontend and the Express server with one
  Next.js app written in TypeScript.
- **Why:** the app has no login check on the server, no schema in the
  repository, almost no tests, and two deployments that have to agree on
  addresses. One app with real sessions fixes all four.
- **Size:** a rewrite of the code, not of the product. The design, the screens
  and the behaviour stay as they are today.
- **Effort:** about 27 to 35 working days for one developer, roughly six to
  seven weeks. See section 4.
- **Risk to users:** low. The current site stays live until the new one is
  switched on. Everyone has to log in once after the switch.

## 2. Where we are and where we are going

| | Today | After |
|---|---|---|
| Frontend | 23 hand-written HTML pages, no build step | React pages and shared components |
| Backend | Express, 73 routes, 35 of them inside one 894-line file | Server code inside the Next app, grouped by area |
| Language | JavaScript, no type checking | TypeScript in strict mode |
| Login | A record in the browser's local storage | A signed session cookie, checked on the server |
| Database | MySQL, queries written by hand, schema not in the repo | Same MySQL database, schema and migrations in the repo (Drizzle) |
| Input checks | Scattered or missing | One Zod schema per form |
| Uploads | Public folder on the server disk, committed to git | Private storage, opened only through signed links |
| Email | nodemailer with one shared layout | Unchanged |
| Hosting | Netlify (pages) and Render (API) | One deployment |
| Tests | One test file | Unit tests for logic, browser tests for the main flows |

### Stack

- Next.js (App Router), TypeScript, React.
- Drizzle ORM with the existing MySQL database.
- Auth.js with email and password. The role (donor, charity, admin) is stored
  in the session.
- Zod for validation.
- The existing `design-system.css`, `auth.css` and `app.css`, loaded as global
  styles. No Tailwind.
- nodemailer, with the layout from `backend/Utils/mailer.js`.
- Vitest and Playwright for tests.

### How the code is organised

```
web/
  app/
    (public)/        landing, 404
    (auth)/          login, signup, forgot-password, reset-password, verify-email
    donor/           dashboard, donations, charities, requests, donate, feedback, account
    charity/         dashboard, requests, offers, post-need, profile, feedback
    admin/           one route per section of today's admin page
    api/             only file downloads: verification documents, CSV reports
  components/        shell, table, dialog, toast, badge, form fields
  db/                schema, migrations, queries grouped by area
  lib/               auth, mailer, validation schemas
  middleware.ts      sends signed-out visitors to /login; checks role per area
```

Pages read from the database on the server. Forms submit through server
actions. That removes most of today's API: 73 routes become a set of typed
functions, and only file downloads remain as addresses.

## 3. What is kept, rewritten and dropped

### Kept as it is

- The design system: tokens, components and all three stylesheets (1,783 lines).
- The database and its data.
- The email layout and the five email templates.
- The wording, screens and flows of every page.
- Existing donor and charity passwords, which are already hashed with bcrypt.

### Rewritten

| Area | Today | Notes |
|---|---|---|
| Landing page | 1,724 lines | Mostly markup and the ribbon animation; moves across nearly unchanged |
| Auth pages | 5 pages, 1,035 lines | Become forms with server actions |
| Donor area | 8 pages, 1,384 lines | |
| Charity area | 6 pages, 1,087 lines | Includes the document upload |
| Admin area | 1 page, 1,309 lines | Split into one route per section |
| Shared scripts | `ui.js`, `app-shell.js`, 504 lines | Become React components |
| Server | 2,268 lines across 23 files | Become queries and server actions |

### Dropped

- `frontend/js/api.js` and `Food Donor Pages/DonorAccount.js`: unused.
- `backend/Routes/donorOffers.js`: never mounted.
- Routes for complaints, settings, notifications and appeals: no page calls
  them. They can be rebuilt when a page needs them.
- The second database module, the duplicate `/api/foodneeds` and
  `/api/food-needs` APIs, and the code that guesses table names.
- `netlify.toml`, the `mysql` package, `body-parser`, `cors`, `multer`.
- The eleven status documents in the repository root.

## 4. How big the refactor is

### In numbers

| Measure | Count |
|---|---|
| Pages to rebuild | 21 (plus the design system page and the 404 page) |
| Admin sections inside the single admin page | 4, to be split into separate routes |
| Server routes defined today | 73 |
| Server routes a page actually calls | about 40 |
| Database tables in use | 8 (donor, charity, admins, charity_verifications, food_needs, food_donations, donor_offers, feedback) |
| Frontend code today | about 10,600 lines |
| Backend code today | about 2,300 lines |
| Expected size after | about 9,000 to 11,000 lines of TypeScript, plus the 1,783 lines of CSS that are kept |

Every file except the stylesheets is rewritten. The line count stays similar
because duplicated markup shrinks while types, validation, login checks and
tests are added.

### In time

Estimates are working days for one developer who knows the codebase.

| Phase | Work | Days |
|---|---|---|
| 0 | Repository clean-up and secrets | 1 |
| 1 | New app, styles, shared components, schema | 3 to 4 |
| 2 | Login, sessions, role checks | 3 to 4 |
| 3 | Landing and auth pages | 2 to 3 |
| 4 | Donor area | 4 to 5 |
| 5 | Charity area, private uploads | 4 to 5 |
| 6 | Admin area | 5 to 6 |
| 7 | Features that exist only in the browser today | 2 to 3 |
| 8 | Tests, switch-over, removal of old code | 3 to 4 |
| | **Total** | **27 to 35** |

These are estimates, not measurements. The two largest unknowns are the admin
area, which has the most logic per page, and the database, whose real schema
has not been inspected yet.

## 5. Phases

Each phase ends in a state that can be checked. The current site is not
touched until phase 8.

### Phase 0: clean-up (before anything else)

- Revoke the Gmail app password that is in the git history and create a new
  one.
- Re-save `.gitignore` as UTF-8 and add `node_modules/` and `.env`.
- Remove `node_modules` and `backend/uploads/` from the repository and from
  its history. This rewrites history, so every clone must be re-cloned
  afterwards.

Done when: a fresh clone contains no dependencies, no uploaded documents and
no credentials.

### Phase 1: foundation

- Create the Next app in `web/` on a branch.
- Load the three stylesheets and the two fonts.
- Build the shared components: app shell, table, dialog, toast, badge, form
  fields, pagination.
- Generate the Drizzle schema from the live database and commit it with a
  first migration.
- Move the design system page across, including the components it does not
  document yet.

Done when: the design system page renders in the new app and a new database
can be built from the repository alone.

### Phase 2: login and access

- Auth.js with email and password for the three roles.
- Middleware that requires a session for `/donor`, `/charity` and `/admin`,
  and the right role for each.
- A one-off script that hashes the admin passwords stored as plain text.
- Rate limits on login, password reset and code sending.

Done when: no signed-in page or action can be reached without a valid session,
and a browser test proves it.

### Phase 3: public and auth pages

- Landing page, login, signup, forgot password, reset password, verify email,
  404.
- Redirects from the old addresses (`/Login.html`, `/reset-password.html` and
  the rest), so links in emails already sent keep working.

### Phase 4: donor area

- Dashboard, donations, browse charities, charity requests, request details,
  make a donation, feedback, account.
- Every query filters by the donor in the session, never by an id sent from
  the browser.

### Phase 5: charity area

- Dashboard, requests, donor offers, post a food need, profile, feedback.
- Charities are identified by id everywhere, not by name.
- Uploads go to private storage, limited to images and PDFs with a size cap.
  Existing documents are moved across.

### Phase 6: admin area

- One route per section: overview, charity verification, users, reports.
- Verification documents are served only to a signed-in admin.
- "Promote to admin" creates an account that can log in.

### Phase 7: features that only exist in the browser

- Save profile edits on the server.
- Make account deletion real.
- Record email verification in the database, and store one-time codes there
  instead of in server memory.

### Phase 8: tests and switch-over

- Unit tests for report totals, status changes and validation.
- Browser tests for: sign up and log in for each role, post a food need,
  make and accept an offer, verify a charity.
- Deploy the new app, point the domain at it, watch it for a week.
- Delete `frontend/`, `backend/` and the Netlify and Render services.

## 6. Risks

| Risk | Effect | How it is handled |
|---|---|---|
| The live database differs from what the code assumes | Phase 1 takes longer | Generate the schema from the database first, before any page work |
| The database could not be reached from the development machine | Local work is blocked | Confirm access, or work against a local copy |
| Serverless hosting opens many database connections | Errors under load | Use a small connection pool, or run the app as one long-lived service |
| History rewrite in phase 0 | Old clones break | Announce it and re-clone |
| Everyone is signed out at the switch | A one-time login | Expected; say so on the login page |
| Behaviour drifts during the rewrite | Bugs that did not exist before | Port page by page and compare against the current site |

## 7. Decisions still needed

1. **Hosting.** Vercel is the natural fit for Next.js. If the database does not
   accept connections from it, run the app as a single service on Render.
2. **Where uploads are stored.** Any private object storage works; the choice
   follows the hosting decision.
3. **The product name.** The site says "FoodShare Kenya", the emails and
   repository say "FoodShare Nairobi". Pick one before the pages are rebuilt.

## 8. Not part of this migration

- New features or changes to the design.
- Merging the three user tables into one.
- Changing database, or moving away from MySQL.
- A mobile app or a public API.
