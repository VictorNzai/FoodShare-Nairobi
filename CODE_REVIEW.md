# FoodShare: issues found and design review

Written October 2026, after the redesign of the whole frontend. It covers
three things:

1. Problems that need action now.
2. Every bug found and fixed during the redesign.
3. Design and development-practice problems that are still open.

File and line references point at the code as it stood when this was written.

---

## 1. Act on these first

These are open. None of them was fixed by the redesign.

### 1.1 An email password was committed to the repository

`backend/Routes/auth.js` contained a Gmail address and its app password as a
fallback value. The fallback has been removed from the code, but **the password
is still in the git history**, and the repository is on GitHub.

- Revoke that app password in the Google account today and create a new one.
- Put the new one only in the server's environment settings.
- Check that the production server has `EMAIL_USER` and `EMAIL_PASSWORD` set.
  Password-reset emails now depend on them, like every other email already did.

### 1.2 Nothing on the server checks who is calling

No route checks a login. There are no sessions and no tokens. "Being logged in"
is a record in the browser's local storage, which anyone can create by hand.

What that allows today, with nothing but the site's address:

- Ban, delete or promote any user (`/api/admin/users/...`).
- Approve or reject any charity (`/api/admin/charity-verifications/...`).
- Read every user's name and email, and all feedback.
- Delete any charity's food request (`DELETE /api/foodneeds/:id`).
- Accept, deny or complete any offer (`/api/donor-offers/:id/...`).
- Read any donor's donations by changing `donor_id` in the address.

The admin page itself also loads for anyone who types its address.

This needs real sessions on the server (for example `express-session` with a
cookie, or signed tokens), a check on every route, and an ownership check on
anything that belongs to one user.

### 1.3 Charities' identity documents are public and in git

- 20 uploaded files are committed under `backend/uploads/charity-verifications/`,
  including a national ID card, tax certificates and incorporation certificates.
- The same folder is served to the public (`server.js`, the
  `/uploads/charity-verifications` static route). Anyone with a file name can
  download a document.
- Uploads accept any file type and any size.

Remove the files from the repository and its history, stop serving the folder
publicly (serve documents only to a logged-in admin), and restrict uploads to
images and PDFs with a size limit.

### 1.4 Admin passwords are stored as plain text

`POST /auth/login` compares the typed admin password directly with the database
value (`server.js` line 247), so admin passwords are stored unhashed. Donor and
charity passwords are hashed correctly.

A side effect: "Promote to admin" copies the user's *hashed* password into the
admins table (line 488), so a promoted admin can never log in.

Hash admin passwords with the same method used for donors and charities.

### 1.5 `.gitignore` is broken and `node_modules` is committed

The root `.gitignore` is saved in UTF-16, which git cannot read, so it ignores
nothing. As a result 1,612 files from `node_modules` are in the repository.
`backend/.env` is only protected by the second ignore file inside `backend/`.

Re-save `.gitignore` as UTF-8, add `node_modules/` and `.env`, and remove
`node_modules` from the repository.

---

## 2. Bugs found and fixed during the redesign

### Admin dashboard

| Problem | What users saw |
|---|---|
| Promote and Demote functions were defined inside another function | The buttons did nothing |
| User text inserted as raw HTML | A script in a feedback comment would run in the admin's browser |
| Pending count recalculated from a filtered list | "Pending Approvals" dropped to 0 when filtering |
| `value \|\| "--"` used for numbers | A real 0 showed as "--" |
| Relative addresses for documents, reports and names | Broken on the production site |
| Details shown with `alert()` and HTML tags | Raw `<b>` tags in a pop-up |
| No error handling on actions | Buttons failed silently when offline |
| Sidebar Logout was a plain link | Stored admin name was not cleared |
| Dashboard data fetched twice | Slower load |
| Search fired on every keystroke | A request per letter typed |

### Donor pages

| Problem | What users saw |
|---|---|
| Relative API addresses on four pages | Browse charities, offers and donations failed on production |
| Saving the profile rebuilt the record without its id | Dashboard stopped loading until next login |
| Status filter compared "Pending" with "pending" | Pending offers were filtered out |
| Signup redirected to the dashboard without a session | An empty dashboard after signing up |
| Sidebar markup copied into each page, and drifted | Dead links, "coming soon" for a page that exists, no sidebar on Feedback |
| "Make a Donation" linked to Browse Charities | The donation form was unreachable |
| "Delete Account" only cleared the browser | Told users the account was deleted when it was not |
| Error rows spanned 7 columns in a 5-column table | Misaligned messages |
| Chart library loaded and never used | Wasted download |
| Verify-email redirected to a page that does not exist | A 404 after verifying |
| Verified message sat inside a hidden form | The success message never appeared |
| User text inserted as raw HTML | Script injection through names and notes |

### Charity pages

| Problem | What users saw |
|---|---|
| Production API address was the literal text `${API_BASE_URL}` | The dashboard never loaded on production |
| Stats had hard-coded sample values (7, 1,200 kg, 350) | Fake figures until, or instead of, real data |
| Charity id read from a storage key that is never written | Donor offers never counted |
| Offers page loaded every charity's offers | Charities could see and act on each other's offers |
| "Deny" called a route that was never mounted | The button did nothing (route now added) |
| Accept, deny and arrived ignored the server's answer | "Success" shown even on failure |
| Sign Out did not clear storage | The session survived signing out |
| Verification state not remembered | Reverted to "Not Verified" on reload |
| Cancel offered on completed requests | Completed records could be deleted |
| "Browse Donor Offers" button had no handler | The button did nothing |
| No mobile menu on Post Food Need | No navigation on phones |

### Auth pages

| Problem | What users saw |
|---|---|
| Reset page checked a `success` flag the server never sends | No redirect to login after resetting |
| Results shown with `alert()` | Blocking browser pop-ups |
| No loading state on a slow server | Looked frozen during the server's cold start |

### Landing page

| Problem | What users saw |
|---|---|
| Counter stepped by 1 on a timer | "50,000+" took minutes to finish counting |
| Cards hidden until a script revealed them | Blank sections if the script failed |

### Shared

| Problem | What users saw |
|---|---|
| Component styles overrode the `hidden` attribute | Hidden buttons stayed visible |
| Missing pages returned raw JSON | `{"success":false}` instead of a page |
| Emails were unstyled and inserted user text as raw HTML | Plain emails; injection through names and notes |

---

## 3. System design problems (open)

### 3.1 Identity and data ownership

- **Sessions live only in the browser** (see 1.2). The charity's record is
  stored under a key named `jwt`, but it is plain JSON, not a token.
- **Charities are identified by name.** Food needs are fetched with
  `?org=<name>`, and approving a verification matches the charity by `orgname`
  (`server.js` line 173). Two charities with the same name collide, and
  renaming one breaks the link. Use the charity's id.
- **Profile edits and account deletion do not exist on the server.** The pages
  change local storage only. The donor profile routes in
  `backend/Routes/donorAccount.js` depend on a login check that is never set
  up, so they always refuse.
- **Email verification is not saved.** The server confirms the code and stops
  (`emailVerification.js` has a TODO where the database update should be). A
  donor is "verified" only in the browser that entered the code.
- **One-time codes are kept in server memory.** They vanish on restart and
  would not work with more than one server.

### 3.2 Backend structure

- **`server.js` is about 890 lines** and holds some 30 routes inline next to
  the routers in `Routes/`. There is no rule for which goes where.
- **Two database modules**: `backend/db.js` and `backend/Database/db.js` (which
  re-exports the first). Routes import either one.
- **Two routers for the same feature**: `donor_offers.js` is mounted;
  `donorOffers.js` is not, and calls functions that do not exist.
- **Two APIs for one table**: `/api/foodneeds` (in `server.js`) and
  `/api/food-needs` (a router). The frontend uses both.
- **Table names are guessed at run time.** Several queries try
  `food_donations` and fall back to `donations`.
- **The schema is not in the repository.** `FoodNeeds.sql` and
  `donor_offers.sql` are empty; there are no migrations. A new database cannot
  be built from the code.
- **Error responses expose database messages** (`err.sqlMessage`) to the client.
- **The database connection disables certificate checking**
  (`rejectUnauthorized: false`).
- **No rate limiting** on login, password reset or code sending, and no
  security headers.
- **Password reset treats any role that is not "donor" as a charity.**

### 3.3 Frontend structure

- **No build step, no components.** Before the redesign each of 22 pages
  carried its own copy of the styles, sidebar and scripts, in three different
  styling approaches (hand-written CSS, Tailwind from a CDN, inline styles).
  That duplication caused most of the navigation bugs above. It is now reduced
  to one stylesheet, one shell script and one helper script, but pages are
  still hand-written HTML.
- **The admin page still has its own copy of the sidebar** instead of using
  `app-shell.js`, because its sections live in one file. It looks the same but
  is separate code.
- **The API address was hard-coded in dozens of places.** It is now in
  `app-shell.js` for donor and charity pages, but the auth pages and the admin
  page each still carry their own.
- **Dead files**: `frontend/js/api.js` is loaded by the landing page and never
  called; `Food Donor Pages/DonorAccount.js` is loaded by nothing.
- **Third-party services at run time**: Google Fonts, Unsplash photos, the
  ui-avatars service and an unpinned Chart.js from a CDN. If any is down or
  changes, the site changes.
- **Folder names contain spaces** (`Food Donor Pages`, `Charity Pages`), which
  forces `%20` in every link.
- **The product has three names**: "FoodShare Kenya" on the site, "FoodShare
  Nairobi" in emails and the repository, "FoodShare" in page titles.

### 3.4 Deployment

- The frontend is on Netlify and the API on Render, so every relative API
  address is a bug waiting to happen (several were).
- `netlify.toml` turns off Netlify's secret scanning.
- The free Render tier sleeps; the first request after a pause is slow. The
  new loading states make that visible instead of looking frozen.

---

## 4. Development-practice problems (open)

- **Almost no automated tests.** None for the frontend; one backend test file
  (`reportGenerator.test.js`) was added during this work. `npm test` prints an
  error and exits.
- **No linting or formatting rules**, so style varied file to file.
- **`package.json`**: both `mysql` and `mysql2` are installed (only `mysql2` is
  needed); `nodemon` is listed as a production dependency.
- **Eleven status documents sit in the repository root** (`DEPLOY_NOW.md`,
  `QUICK_FIX_SUMMARY.md` and others) describing past fixes. They belong in
  commit messages or one changelog.
- **A stray two-byte file named `FoodShare`** sits in the root.
- **Commented-out features and "coming soon" stubs** were left in pages.
- **Comments describe intentions that the code does not carry out**, for
  example "Delete account" marked TODO while the button told users it worked.
- **Features were built in the browser first** and never connected to the
  server (profile edit, account deletion, verification state).

---

## 5. Suggested order of work

1. Revoke the leaked email password (1.1).
2. Remove uploaded documents and `node_modules` from git; fix `.gitignore`
   (1.3, 1.5).
3. Add server-side sessions and protect every route (1.2). Hash admin
   passwords at the same time (1.4).
4. Stop serving uploads publicly; add file type and size limits (1.3).
5. Save email verification, profile edits and account deletion on the server
   (3.1).
6. Put the database schema in the repository (3.2).
7. Split `server.js` into routers and remove the duplicate modules (3.2).
8. Add tests for login, offers and verification before further changes (4).

---

## 6. What the redesign added

- `frontend/styles/design-system.css`: colours, type, spacing and every shared
  component. Documented at `/design-system.html`.
- `frontend/styles/auth.css` and `frontend/styles/app.css`: layouts for the
  auth pages and the signed-in pages.
- `frontend/js/ui.js`: toasts, confirm dialogs, loading buttons, text escaping,
  status badges.
- `frontend/js/app-shell.js`: sidebar, mobile menu, session helpers and the API
  address for donor and charity pages.
- `backend/Utils/mailer.js`: one layout for all emails, with user text escaped.
- `frontend/404.html`: the page shown for a missing address.

Not yet done: the newer components (card grid, avatar, text area, file input,
app shell) are in the stylesheet but not yet shown on the design system page.
