# WNMU Programming Library — Quarterly Issues & Programming Report Builder

This handoff adds a proper standalone report-builder page for the FCC / Quarterly Issues & Programming workflow.

It is designed to be:

- **Admin-only**
- **Read-only against current program data**
- **Additive**
- **Description-first for category suggestions**
- **Review-first before export**
- **Not a patch stuffed into an unrelated helper file**

## Files included

Copy these files into the root of `WNMU-Programming-library`:

```text
quarterly-issues.html
styles-quarterly-issues.css
js/quarterly-issues-report.js
```

Optional integration snippets are in:

```text
integration/
```

Those snippets show how to expose the page from the existing main app only when Admin mode is active.

## What this feature does

The report builder reads from the current Supabase `programs_enriched` data and builds a draft report from:

- `title`
- `nola_eidr`
- `notes` / description
- `length_minutes`
- `aired_13_1`
- `aired_13_3`
- `program_type`
- `topic`
- `secondary_topic`
- `distributor`
- `is_archived`

It does **not** write to Supabase.

There are no calls to:

```js
.insert()
.update()
.delete()
.rpc()
```

in `js/quarterly-issues-report.js`.

## How categories are suggested

Categories are suggested from the **description text only**.

The title is displayed and used for identification/grouping, but the classifier intentionally does not use title keywords to assign categories.

If the description is blank or too generic, the row is flagged for review instead of guessing from the title.

Standing categories:

- Children’s Education / Programming
- Educational Issues
- Economy and Business
- Health Issues
- Environmental Issues
- Legal / Civil Rights
- Political / Government Issues
- Arts / Humanities / Cultural Issues
- Historically Underrepresented

## Admin-only behavior

The standalone page checks the current Supabase auth session.

If the user is not signed in as admin, it shows an Admin Required screen and does not load report data.

To make the feature visible from the main app only in Admin mode, apply the snippets in:

```text
integration/MAIN_APP_INTEGRATION_NOTES.md
```

## Export

The first pass exports a CSV draft with:

- Review Status
- Program Title
- NOLA
- Airings
- Duration
- Description
- Suggested category columns
- Confidence
- Reason

The category checkboxes and review status are local to the draft page. They are exported but never saved back to the database.

## Recommended install order

1. Copy the three feature files into the repo.
2. Open `quarterly-issues.html` while signed in as admin.
3. Confirm it loads current data and builds drafts correctly.
4. Apply the admin-only main-app navigation snippets.
5. Test read-only/non-admin behavior.
6. Commit after review.

## Safety notes

This is deliberately not a final FCC filing generator yet. It is a draft builder. Human review is still required before uploading the final Word/PDF report.
