# WNMU Programming Library — Fixed index.html handoff

This package gives you the actual edited files. No PowerShell helper is required.

Copy these into the repo base:

```text
index.html
js/active-scope-control.js
js/clear-all-reset-sync.js
```

## What changed in index.html

Two script tags were added after the existing main UI script:

```html
<script defer src="js/active-scope-control.js?v=1.0.0"></script>
<script defer src="js/clear-all-reset-sync.js?v=1.0.1"></script>
```

## What the JS files do

`js/active-scope-control.js` adds the Titles scope control:

```text
Active only / All records / Archived
```

`js/clear-all-reset-sync.js` fixes Clear All Filters so the real filter state and the visible checkbox/dropdown state both clear.

## Safety

These are UI-only files. They do not write to Supabase and do not modify program records.
