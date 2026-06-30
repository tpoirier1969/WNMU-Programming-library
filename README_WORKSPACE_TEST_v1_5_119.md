# WNMU Programming Workspace Test — v1.5.119 Active Scope + Clear All Fix

This package targets the split-screen test page:

```text
program-workspace-test.html
```

It does **not** target the production `index.html`.

## Files

Copy these into the repo base:

```text
program-workspace-test.html
js/workspace-scope-clearall-v15119.js
```

## What changed

### `program-workspace-test.html`

- Version flag bumped from `v1.5.118` to `v1.5.119`.
- Visible version pill bumped from `v1.5.118` to `v1.5.119`.
- Added this test-page-only script:

```html
<script defer src="js/workspace-scope-clearall-v15119.js?v=1.5.119"></script>
```

### `js/workspace-scope-clearall-v15119.js`

Adds the missing title scope selector to the split-screen filter cluster:

```text
Titles: Active only / All records / Archived
```

It also shrinks/repositions Status and Rating to make room for the new selector.

Wide layout:

```text
Status | Rating | Titles
```

Narrow filter-cluster layout:

```text
Status | Rating | Titles
```

## Clear All behavior

The test page already had custom checkbox dropdowns for Topics / Secondary topics / Lengths / Uses.

This fix makes Clear All:

- clear the actual native filter values
- uncheck the custom dropdown checkboxes
- reset the dropdown labels
- close any open dropdown panels
- reset the title scope to `Active only`
- refresh the program list

## Safety

This is UI-only.

It does not write to Supabase and does not modify program records.
